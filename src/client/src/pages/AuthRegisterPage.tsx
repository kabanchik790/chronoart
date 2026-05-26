import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router-dom';
import { ApiError, register as registerUser } from '../api/auth';
import { IconArrowRight } from '../assets/icons';
import PageShell from '../components/PageShell';
import { useAuth } from '../hooks/useAuth';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export default function AuthRegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = handleSubmit(async ({ name, email, password: userPassword }) => {
    setServerError('');

    try {
      await registerUser({ name, email, password: userPassword });
      await refresh();
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerError('Этот email уже зарегистрирован');
        return;
      }

      setServerError('Не удалось создать аккаунт. Попробуйте позже.');
    }
  });

  return (
    <PageShell className="auth-page" eyebrow="" title="РЕГИСТРАЦИЯ">
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Имя
          <input
            type="text"
            autoComplete="name"
            placeholder="Как к вам обращаться"
            required
            {...register('name', { required: true })}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            {...register('email', { required: true })}
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Не менее 8 символов"
            required
            {...register('password', { required: true, minLength: 6 })}
          />
        </label>
        <label>
          Подтверждение пароля
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Повторите пароль"
            required
            {...register('passwordConfirm', {
              required: true,
              validate: (value) => value === password || 'Пароли не совпадают',
            })}
          />
        </label>
        {errors.passwordConfirm?.message ? (
          <p className="form-error">{errors.passwordConfirm.message}</p>
        ) : null}
        {serverError ? <p className="form-error">{serverError}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ АККАУНТ'}
        </button>
      </form>
      <NavLink className="auth-switch-link" to="/auth">
        Уже есть аккаунт? Войдите <IconArrowRight size={14} />
      </NavLink>
    </PageShell>
  );
}
