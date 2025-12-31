'use client';

import type { FC } from 'react';
import { useEffect, useState, useRef } from 'react';
import type { StatsSectionProps, StatItem } from '@/types/landing.types';

type AnimatedCounterProps = {
  value: string;
  suffix?: string;
};

const AnimatedCounter: FC<AnimatedCounterProps> = ({ value, suffix = '' }) => {
  const [count, setCount] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const ref = useRef<HTMLSpanElement>(null);

  const numericValue: number = parseInt(value.replace(/\D/g, ''), 10);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 },
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const newValue = Math.min(Math.round(increment * currentStep), numericValue);
      setCount(newValue);

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, numericValue]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString('es-PE')}
      {suffix}
    </span>
  );
};

const StatCard: FC<{ stat: StatItem; index: number }> = ({ stat, index }) => {
  return (
    <div className="relative flex flex-col items-center p-8 text-center transition-transform duration-300 hover:scale-105" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="relative mb-2 text-5xl font-bold text-white sm:text-6xl" style={{ fontFamily: 'var(--font-montserrat)' }}>
        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
      </div>

      <p className="relative text-base font-medium uppercase tracking-wider text-white/80">{stat.label}</p>
    </div>
  );
};

export const StatsSection: FC<StatsSectionProps> = ({ stats }) => {
  return (
    <section className="relative py-20 bg-primary overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: 'var(--font-montserrat)' }}>
            Impacto en la Región
          </h2>
          <p className="text-lg text-white/70">Transformando la gestión documental en Ayacucho</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.id} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
