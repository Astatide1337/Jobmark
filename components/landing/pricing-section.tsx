/**
 * Landing Page Pricing Table
 *
 * Why: Provides clear, low-friction entry points into the product.
 * It uses a spring-loaded billing toggle (Monthly vs. Annual) to
 * instantly update the value proposition across all cards.
 *
 * Integration: Every CTA connects to the `AuthModalProvider` to
 * convert interest into sign-ups without leaving the page.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useAuthModal } from '@/components/auth';

const MONTHLY_PRICE = 8;
const ANNUAL_DISCOUNT = 0.2; // 20% off
const ANNUAL_PRICE = Math.round(MONTHLY_PRICE * 12 * (1 - ANNUAL_DISCOUNT));

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  description: string;
  price: { monthly: number; annual: number };
  features: PlanFeature[];
  cta: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    price: { monthly: 0, annual: 0 },
    features: [
      { text: 'Unlimited journal entries', included: true },
      { text: '30-day entry history', included: true },
      { text: '3 AI reports per month', included: true },
      { text: 'Basic templates', included: true },
      { text: 'Timeline view', included: true },
      { text: 'Unlimited AI reports', included: false },
      { text: 'Export to PDF/Markdown', included: false },
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    description: 'For professionals serious about their career',
    price: { monthly: MONTHLY_PRICE, annual: ANNUAL_PRICE },
    features: [
      { text: 'Unlimited journal entries', included: true },
      { text: 'Unlimited entry history', included: true },
      { text: 'Unlimited AI reports', included: true },
      { text: 'Premium templates', included: true },
      { text: 'Timeline view', included: true },
      { text: 'Export to PDF/Markdown', included: true },
      { text: 'Advanced insights', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Get Pro',
    highlighted: true,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { openAuthModal } = useAuthModal();

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center justify-center gap-3"
          >
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">Pricing</span>
            <div className="bg-primary/50 h-px w-12" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Simple, <span className="text-primary">transparent</span> pricing
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Start free. Upgrade when you're ready for more.
          </motion.p>
        </div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12 flex items-center justify-center gap-4"
        >
          <span className={`text-sm ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>

          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-primary' : 'bg-border'} `}
          >
            <motion.div
              animate={{ x: isAnnual ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
            />
          </button>

          <span className={`text-sm ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual
          </span>

          {isAnnual && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
            >
              Save 20%
            </motion.span>
          )}
        </motion.div>

        {/* Pricing cards */}
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-card border-primary/40 shadow-primary/5 shadow-lg'
                  : 'bg-card/60 border-border/40 hover:border-border/60'
              } `}
            >
              {/* Highlighted badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="mb-2 font-serif text-xl font-semibold">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${isAnnual ? Math.round(plan.price.annual / 12) : plan.price.monthly}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {plan.price.monthly > 0 && isAnnual && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    ${plan.price.annual} billed annually
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map(feature => (
                  <li
                    key={feature.text}
                    className={`flex items-start gap-3 text-sm ${
                      feature.included ? 'text-foreground' : 'text-muted-foreground/50'
                    }`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        feature.included ? 'text-primary' : 'text-muted-foreground/30'
                      }`}
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={openAuthModal}
                className={`block w-full rounded-full px-6 py-3 text-center font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-card border-border/60 text-foreground hover:bg-accent border'
                } `}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-muted-foreground/60 mt-12 text-center text-sm"
        >
          No credit card required for free plan. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
