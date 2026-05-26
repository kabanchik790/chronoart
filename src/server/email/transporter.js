'use strict';
const nodemailer = require('nodemailer');

const STATUS_LABELS = {
  new: 'Новый',
  accepted: 'Принят',
  rejected: 'Отклонён',
  in_progress: 'В работе',
  ready: 'Готов',
  completed: 'Выполнен',
};

// Поддерживает любой SMTP-провайдер через переменные SMTP_*
// Обратная совместимость: если SMTP_* не заданы, берём GMAIL_USER/GMAIL_APP_PASSWORD
const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: smtpUser, pass: smtpPass },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

async function sendMail(options) {
  if (!smtpUser || !smtpPass) {
    console.error('[email] SMTP credentials не заданы — письмо не отправлено');
    return;
  }
  return transporter.sendMail({
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
