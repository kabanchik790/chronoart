import contactMaster from '../assets/contact-master.png';

const contactRows = [
  {
    label: 'Телефон',
    value: '+7 999 000 00 00',
    href: 'tel:+79990000000',
  },
  {
    label: 'Email',
    value: 'master@chronoart.ru',
    href: 'mailto:master@chronoart.ru',
  },
  {
    label: 'Telegram-канал',
    value: '@chronoart_atelier',
    href: 'https://t.me/chronoart_atelier',
  },
  {
    label: 'Адрес мастерской',
    value: 'Санкт-Петербург, набережная Мойки, 12, ателье 4',
  },
];

export default function ContactsPage() {
  return (
    <section className="contacts-page">
      <h1>Контакты</h1>

      <div className="contacts-layout">
        <div className="contacts-photo">
          <img src={contactMaster} alt="Иван Суханов" />
        </div>

        <div className="contacts-info">
          <div className="contacts-list">
            {contactRows.map((row) => (
              <div className="contacts-field" key={row.label}>
                <span>{row.label}</span>
                {row.href ? (
                  <a href={row.href}>{row.value}</a>
                ) : (
                  <p>{row.value}</p>
                )}
              </div>
            ))}
          </div>

          <p className="contacts-note">
            Мастерская принимает по предварительной договорённости. Режим работы
            — будни с 11:00 до 19:00 и суббота с 12:00 до 17:00. Воскресенье и
            понедельник — выходные. Перед визитом напишите в Telegram или на
            email, чтобы согласовать время.
          </p>
        </div>
      </div>
    </section>
  );
}
