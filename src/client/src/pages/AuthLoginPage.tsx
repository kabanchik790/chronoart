import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, login } from '../api/auth';
import { IconArrowRight } from '../assets/icons';
import PageShell from '../components/PageShell';
import { useAuth } from '../hooks/useAuth';

type LoginForm = {
  email: string;
  password: string;
};

function getNextUrl(search: string) {
  const next = new URLSearchParams(search).get('next');
  return next?.startsWith('/') ? next : '/';
}

export default function AuthLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [authError, setAuthError] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(false);
    setFormError('');

    try {
      await login(values);
      await refresh();
      navigate(getNextUrl(location.search), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthError(true);
        return;
      }

      setFormError('Не удалось выполнить вход. Попробуйте позже.');
    }
  });

  if (authError) {
    return (
      <PageShell className="auth-page" eyebrow="" title="ВХОД">
        <form className="auth-form" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              placeholder="Не менее 8 символов"
              required
              {...register('password', { required: true })}
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'ВХОД...' : 'ВОЙТИ'}
          </button>
          <div className="auth-alert">
            <span aria-hidden="true" />
            <p>Неверный email или пароль</p>
          </div>
        </form>
        <NavLink className="auth-switch-link" to="/auth/register">
          Нет аккаунта? Зарегистрируйтесь <IconArrowRight size={14} />
        </NavLink>
      </PageShell>
    );
  }

  return (
    <PageShell className="auth-page" eyebrow="" title="ВХОД">
      <form className="auth-form" onSubmit={onSubmit}>
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
            autoComplete="current-password"
            placeholder="Не менее 8 символов"
            required
            {...register('password', { required: true })}
          />
        </label>
        {formError ? <p className="form-error">{formError}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'ВХОД...' : 'ВОЙТИ'}
        </button>
      </form>
      <NavLink className="auth-switch-link" to="/auth/register">
        Нет аккаунта? Зарегистрируйтесь <IconArrowRight size={14} />
      </NavLink>
    </PageShell>
  );
}
