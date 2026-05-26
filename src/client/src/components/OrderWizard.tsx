import { FormEvent, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ApiError } from '../api/auth';
import { IconArrowLeft, IconArrowRight } from '../assets/icons';
import { createOrder } from '../api/orders';
import mechanismImage from '../assets/wizard/mechanism-auto.png';
import caseImage from '../assets/wizard/case-round.png';
import dialImage from '../assets/wizard/dial-enamel.png';
import strapImage from '../assets/wizard/strap-leather.png';
import { useAuth } from '../hooks/useAuth';
import { useOrderForm } from '../hooks/useOrderForm';
import type { OrderFormValues } from '../types';

type Option = {
  value: string;
  label: string;
  description: string;
};

type ChoiceStep = {
  key: 'mechanism' | 'case_type' | 'dial' | 'strap';
  title: string;
  image: string;
  options: Option[];
};

const choiceSteps: ChoiceStep[] = [
  {
    key: 'mechanism',
    title: 'ВЫБЕРИТЕ МЕХАНИЗМ',
    image: mechanismImage,
    options: [
      { value: 'Автоматический', label: 'АВТОМАТИЧЕСКИЙ', description: 'Заводится от движения руки, подходит для повседневной носки.' },
      { value: 'Ручной завод', label: 'РУЧНОЙ ЗАВОД', description: 'Классическая механика с ежедневным ритуалом завода.' },
      { value: 'Скелетон', label: 'СКЕЛЕТОН', description: 'Открытая конструкция с видимой работой механизма.' },
      { value: 'Open-heart', label: 'OPEN-HEART', description: 'Открытый баланс без полного скелетонирования циферблата.' },
    ],
  },
  {
    key: 'case_type',
    title: 'ВЫБЕРИТЕ ФОРМУ КОРПУСА',
    image: caseImage,
    options: [
      { value: 'Круглая', label: 'КРУГЛАЯ', description: 'Классическая форма, универсальна для любого стиля.' },
      { value: 'Квадратная', label: 'КВАДРАТНАЯ', description: 'Геометричный, строгий характер.' },
      { value: 'Прямоугольная', label: 'ПРЯМОУГОЛЬНАЯ', description: 'Вытянутая форма, ближе к винтажной эстетике.' },
      { value: 'Бочкообразная', label: 'БОЧКООБРАЗНАЯ', description: 'Мягкие изгибы, редкая форма корпуса.' },
    ],
  },
  {
    key: 'dial',
    title: 'ВЫБЕРИТЕ ЦИФЕРБЛАТ',
    image: dialImage,
    options: [
      { value: 'Эмалевый', label: 'ЭМАЛЕВЫЙ', description: 'Глянцевая поверхность и глубокий цвет.' },
      { value: 'Гильоше', label: 'ГИЛЬОШЕ', description: 'Рельефный узор с ручной или станочной фактурой.' },
      { value: 'Скелетон', label: 'СКЕЛЕТОН', description: 'Минимум закрытых поверхностей, акцент на механике.' },
      { value: 'Матовый', label: 'МАТОВЫЙ', description: 'Спокойная поверхность без бликов.' },
    ],
  },
  {
    key: 'strap',
    title: 'ВЫБЕРИТЕ РЕМЕШОК',
    image: strapImage,
    options: [
      { value: 'Кожа', label: 'КОЖА', description: 'Классический ремешок ручной прошивки.' },
      { value: 'Сталь', label: 'СТАЛЬ', description: 'Браслет в тон корпуса, более утилитарный характер.' },
      { value: 'Ткань', label: 'ТКАНЬ', description: 'Лёгкий повседневный вариант.' },
      { value: 'Каучук', label: 'КАУЧУК', description: 'Практичный ремешок для активного использования.' },
    ],
  },
];

const finalFields: Array<{
  key: keyof Pick<OrderFormValues, 'engraving' | 'budget' | 'notes' | 'name' | 'email' | 'password'>;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}> = [
  { key: 'engraving', label: 'ТЕКСТ ГРАВИРОВКИ', maxLength: 50 },
  { key: 'budget', label: 'БЮДЖЕТ В РУБ. (НАПРИМЕР: 50 000)', required: true },
  { key: 'notes', label: 'ОСОБЫЕ ПОЖЕЛАНИЯ' },
];

export default function OrderWizard() {
  const { user, refresh } = useAuth();
  const orderForm = useOrderForm(user);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isFinalStep = stepIndex === choiceSteps.length;

  const goBack = () => {
    setSubmitError('');
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    setSubmitError('');
    setStepIndex((current) => Math.min(choiceSteps.length, current + 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    if (!orderForm.validateFinalStep()) {
      return;
    }

    try {
      const response = await createOrder(orderForm.payload);
      await refresh();
      setCreatedOrderId(response.order_id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.code === 'EMAIL_EXISTS') {
        setSubmitError('Этот email уже зарегистрирован, войдите');
        return;
      }

      setSubmitError('Не удалось отправить заявку. Попробуйте позже.');
    }
  };

  if (createdOrderId) {
    return (
      <section id="wizard" className="wizard-section wizard-success">
        <h2>ЗАЯВКА ОТПРАВЛЕНА</h2>
        <p>
          Заказ #{createdOrderId} создан. Дальше мастер проверит параметры и
          вернётся с уточнениями в карточке заказа.
        </p>
        <div className="wizard-success-actions">
          <NavLink className="button-primary" to={`/my-orders?order=${createdOrderId}`}>
            ПЕРЕЙТИ К МОИМ ЗАКАЗАМ
          </NavLink>
          <NavLink className="button-ghost" to="/">
            ВЕРНУТЬСЯ НА ГЛАВНУЮ
          </NavLink>
        </div>
      </section>
    );
  }

  const currentStep = choiceSteps[stepIndex];

  return (
    <section id="wizard" className="wizard-section">
      <h2>ОФОРМЛЕНИЕ ЗАКАЗА</h2>
      <form className={isFinalStep ? 'wizard-stage wizard-stage-final' : 'wizard-stage'} onSubmit={handleSubmit}>
        {!isFinalStep ? (
          <div className="wizard-image-panel">
            <img src={currentStep.image} alt="" />
          </div>
        ) : (
          <div className="wizard-final-spacer" aria-hidden="true" />
        )}

        <div className="wizard-controls">
          <p className="wizard-step-count">ШАГ {stepIndex + 1} ИЗ 5</p>
          {!isFinalStep ? (
            <>
              <h3>{currentStep.title}</h3>
              <div className="wizard-options">
                {currentStep.options.map((option) => (
                  <label key={option.value} className="wizard-option">
                    <input
                      type="radio"
                      name={currentStep.key}
                      checked={orderForm.values[currentStep.key] === option.value}
                      onChange={() => orderForm.selectValue(currentStep.key, option.value)}
                    />
                    <span aria-hidden="true" />
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>ДЕТАЛИ ЗАКАЗА</h3>
              <div className="wizard-fields">
                {finalFields.map((field) => (
                  <label
                    key={field.key}
                    className={[
                      'wizard-field',
                      orderForm.values[field.key] ? 'is-filled' : '',
                      orderForm.errors[field.key] ? 'has-error' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span>{field.label}{field.required ? '*' : ''}</span>
                    <input
                      type={field.key === 'budget' ? 'number' : 'text'}
                      min={field.key === 'budget' ? 1 : undefined}
                      maxLength={field.maxLength}
                      required={field.required}
                      value={orderForm.values[field.key]}
                      onChange={(event) => orderForm.updateValue(field.key, event.target.value)}
                    />
                    {field.key === 'engraving' ? (
                      <small>{orderForm.values.engraving.length}/50 символов</small>
                    ) : null}
                    {orderForm.errors[field.key] ? <em>{orderForm.errors[field.key]}</em> : null}
                  </label>
                ))}

                {!user ? (
                  <>
                    <label className={['wizard-field', orderForm.values.name ? 'is-filled' : '', orderForm.errors.name ? 'has-error' : ''].filter(Boolean).join(' ')}>
                      <span>ИМЯ*</span>
                      <input
                        type="text"
                        autoComplete="name"
                        required
                        value={orderForm.values.name}
                        onChange={(event) => orderForm.updateValue('name', event.target.value)}
                      />
                      {orderForm.errors.name ? <em>{orderForm.errors.name}</em> : null}
                    </label>
                    <label className={['wizard-field', orderForm.values.email ? 'is-filled' : '', orderForm.errors.email ? 'has-error' : ''].filter(Boolean).join(' ')}>
                      <span>EMAIL*</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={orderForm.values.email}
                        onChange={(event) => orderForm.updateValue('email', event.target.value)}
                      />
                      {orderForm.errors.email ? <em>{orderForm.errors.email}</em> : null}
                    </label>
                    <label className={['wizard-field', 'password-field', orderForm.values.password ? 'is-filled' : '', orderForm.errors.password ? 'has-error' : ''].filter(Boolean).join(' ')}>
                      <span>ПАРОЛЬ*</span>
                      <div className="password-input-row">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={orderForm.values.password}
                          onChange={(event) => orderForm.updateValue('password', event.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword((value) => !value)}>
                          {showPassword ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>
                      {orderForm.errors.password ? <em>{orderForm.errors.password}</em> : null}
                    </label>
                  </>
                ) : null}
              </div>
              {submitError ? <p className="wizard-submit-error">{submitError}</p> : null}
            </>
          )}

          <div className={stepIndex === 0 ? 'wizard-actions wizard-actions-first' : 'wizard-actions'}>
            {stepIndex > 0 && (
              <button type="button" className="button-ghost button-back" onClick={goBack}>
                <IconArrowLeft size={20} />
              </button>
            )}
            {!isFinalStep ? (
              <button type="button" className="button-primary" onClick={goNext}>
                ДАЛЕЕ <IconArrowRight size={20} />
              </button>
            ) : (
              <button type="submit" className="button-primary">
                ОТПРАВИТЬ ЗАЯВКУ <IconArrowRight size={20} />
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
