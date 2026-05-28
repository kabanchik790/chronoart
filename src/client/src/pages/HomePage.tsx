import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getProjectImageUrl, list as listProjects } from '../api/projects';
import OrderWizard from '../components/OrderWizard';
import masterPhoto from '../assets/master-photo.png';
import { useDragScroll } from '../hooks/useDragScroll';
import type { Project } from '../types';
import { formatProjectNumber, getProjectMeta } from '../utils/projects';
import { IconArrowRight } from '../assets/icons';

const processSteps = [
  {
    number: '001',
    title: 'ЗАЯВКА',
    text: 'Выбираете механизм, корпус, циферблат и ремешок через форму. Оставляете пожелания и бюджет.',
  },
  {
    number: '002',
    title: 'СОГЛАСОВАНИЕ',
    text: 'Я рассматриваю заявку и пишу в чат. Уточняем детали, материалы, сроки, условия оплаты.',
  },
  {
    number: '003',
    title: 'ИЗГОТОВЛЕНИЕ',
    text: 'Я делаю часы. Статус заказа обновляется в личном кабинете — вы видите на каком этапе работа.',
  },
  {
    number: '004',
    title: 'ПЕРЕДАЧА',
    text: 'Заказ готов. Я связываюсь с вами для уточнения способа передачи изделия.',
  },
];

export default function HomePage() {
  const location = useLocation();
  const { ref, dragScrollProps } = useDragScroll<HTMLDivElement>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError('');

    try {
      const response = await listProjects();
      setProjects(response.slice(0, 8));
    } catch {
      setProjectsError('Портфолио временно недоступно.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const heroProjects = useMemo(() => projects.slice(0, 8), [projects]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    document.querySelector(location.hash)?.scrollIntoView({ block: 'start' });
  }, [location.hash]);

  return (
    <>
      <section className="home-hero">
        <div className="hero-carousel" ref={ref} {...dragScrollProps}>
          {projectsLoading ? <p className="hero-carousel-state">ЗАГРУЗКА ПОРТФОЛИО...</p> : null}
          {projectsError ? <p className="hero-carousel-state error">{projectsError}</p> : null}
          {!projectsLoading && !projectsError && heroProjects.length === 0 ? (
            <p className="hero-carousel-state">ПОРТФОЛИО ПОКА ПУСТО</p>
          ) : null}

          {heroProjects.map((project, index) => (
            <Link to={`/project/${project.id}`} className="work-card" key={project.id}>
              <div className="work-card-heading">
                <p>({formatProjectNumber(index + 1)})</p>
                <div className="work-card-info">
                  <h2>{project.title}</h2>
                  <span>[{getProjectMeta(project.description)}]</span>
                </div>
              </div>
              {project.image_url ? (
                <img src={getProjectImageUrl(project)} alt="" draggable="false" />
              ) : (
                <div className="project-image-fallback">НЕТ ФОТО</div>
              )}
            </Link>
          ))}
        </div>

        <div className="hero-description">
          <p>
            ИЗГОТАВЛИВАЮ МЕХАНИЧЕСКИЕ ЧАСЫ ПО ИНДИВИДУАЛЬНОМУ
            ПРОЕКТУ. ОТ ЭСКИЗА ДО ИЗДЕЛИЯ ЗА 8–12 НЕДЕЛЬ.
          </p>
          <NavLink to="/projects">ВСЕ РАБОТЫ В ПОРТФОЛИО <IconArrowRight size={14} /></NavLink>
        </div>

        <h1>ЧАСЫ РУЧНОЙ РАБОТЫ</h1>
      </section>

      <section id="about" className="about-section">
        <img src={masterPhoto} alt="" />
        <h2>ИВАН СУХАНОВ</h2>
        <div className="about-copy">
          <p>
            Профессионально занимаюсь часовым делом с 2010 года. Окончил ЛИТМО
            по специальности приборостроение, после чего три года работал на
            петербургском часовом заводе «Победа» — собирал и регулировал
            механизмы серийных моделей. В 2013 году открыл собственное ателье и
            сосредоточился на индивидуальных заказах.
          </p>
          <p>
            Серийных часов не выпускаю. Каждый заказ — отдельный проект с
            эскизом, согласованием материалов и деталей через чат. Один заказ —
            одни часы. Никаких лимитированных серий, никаких партий. Если вам
            нужны конкретные характеристики и идеи воплощения — оформляйте
            заявку, обсудим.
          </p>
          <NavLink to="/contacts">СВЯЗАТЬСЯ СО МНОЙ <IconArrowRight size={14} /></NavLink>
        </div>
      </section>

      <section id="process" className="process-section">
        <div className="process-heading">
          <h2>КАК УСТРОЕН ЗАКАЗ</h2>
          <div className="process-copy">
            <p>
              Весь процесс проходит на платформе — от заявки до готового изделия.
              Никаких лишних звонков и посредников.
              Обычно 8–12 недель в зависимости от сложности заказа.
            </p>
            <NavLink to="/#wizard">ОФОРМИТЬ ЗАКАЗ <IconArrowRight size={14} /></NavLink>
          </div>
        </div>
        <div className="process-grid">
          {processSteps.map((step) => (
            <article key={step.number} className="process-step">
              <span>{step.number}</span>
              <div className="process-step-body">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <OrderWizard />
    </>
  );
}
