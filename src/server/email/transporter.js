'use strict';
const dns = require('dns');
const nodemailer = require('nodemailer');

const STATUS_LABELS = {
  new: 'Новый',
  accepted: 'Принят',
  rejected: 'Отклонён',
  in_progress: 'В работе',
  ready: 'Готов',
  completed: 'Выполнен',
};

const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const smtpHostname = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpSecure = process.env.SMTP_SECURE === 'true';

// Ленивая инициализация транспорта: resolveHost вызывается один раз при первой отправке.
// Timeweb блокирует исходящий SMTP по IPv4 (порт 587/465), но пропускает IPv6.
// Nodemailer делает собственный dns.resolve4() и игнорирует --dns-result-order,
// поэтому явно резолвим AAAA-запись и передаём IP напрямую.
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  let host = smtpHostname;
  try {
    const addrs = await dns.promises.resolve6(smtpHostname);
    if (addrs.length > 0) {
      host = addrs[0]; // сырой IPv6-адрес — nodemailer передаёт его прямо в net.connect
      console.log(`[email] ${smtpHostname} → ${host} (IPv6)`);
    }
  } catch {
    console.warn(`[email] IPv6 resolve failed for ${smtpHostname}, using hostname`);
  }

  _transporter = nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    // При подключении по IP нужно явно указать servername для TLS/SNI,
    // иначе сертификат проверяется по IP, а не по hostname
    tls: { servername: smtpHostname },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  return _transporter;
}

async function sendMail(options) {
  if (!smtpUser || !smtpPass) {
    console.error('[email] SMTP credentials не заданы — письмо не отправлено');
    return;
  }
  const t = await getTransporter();
  return t.sendMail({
    from: `"CHRONO—ART" <${smtpUser}>`,
    ...options,
  }).then((info) => {
    console.log(`[email] sent to=${options.to} subject="${options.subject}" id=${info.messageId}`);
    return info;
  });
}

// FR-17: клиент получает письмо при смене статуса заказа
function buildStatusEmail(to, orderId, oldStatus, newStatus) {
  const from = STATUS_LABELS[oldStatus] || oldStatus;
  const to_ = STATUS_LABELS[newStatus] || newStatus;
  return {
    to,
    subject: 'Статус вашего заказа изменён',
    text: [
      'Здравствуйте!',
      '',
      `Статус вашего заказа #${orderId} изменён:`,
      `  ${from} → ${to_}`,
      '',
      'Откройте кабинет, чтобы посмотреть подробности:',
      `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/my-orders`,
      '',
      'CHRONO—ART',
    ].join('\n'),
  };
}

// FR-18: клиент получает письмо при сообщении мастера
function buildMessageEmail(to, orderId, text) {
  const snippet = text
    ? text.slice(0, 200)
    : 'Мастер прикрепил фото к заказу. Откройте кабинет, чтобы посмотреть.';
  return {
    to,
    subject: `Новое сообщение по заказу #${orderId}`,
    text: [
      'Здравствуйте!',
      '',
      `Мастер отправил сообщение по заказу #${orderId}:`,
      '',
      snippet,
      '',
      'Откройте кабинет для просмотра:',
      `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/my-orders`,
      '',
      'CHRONO—ART',
    ].join('\n'),
  };
}

module.exports = { sendMail, buildStatusEmail, buildMessageEmail };
