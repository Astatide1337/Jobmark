"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useAuthModal } from "@/components/auth";

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
    name: "Free",
    description: "Perfect for getting started",
    price: { monthly: 0, annual: 0 },
    features: [
      { text: "Unlimited journal entries", included: true },
      { text: "30-day entry history", included: true },
      { text: "3 AI reports per month", included: true },
      { text: "Basic templates", included: true },
      { text: "Timeline view", included: true },
      { text: "Unlimited AI reports", included: false },
      { text: "Export to PDF/Markdown", included: false },
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    description: "For professionals serious about their career",
    price: { monthly: MONTHLY_PRICE, annual: ANNUAL_PRICE },
    features: [
      { text: "Unlimited journal entries", included: true },
      { text: "Unlimited entry history", included: true },
      { text: "Unlimited AI reports", included: true },
      { text: "Premium templates", included: true },
      { text: "Timeline view", included: true },
      { text: "Export to PDF/Markdown", included: true },
      { text: "Advanced insights", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Get Pro",
    highlighted: true,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { openAuthModal } = useAuthModal();

  return (
    <section id="pricing" className="py-24 lg:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="h-px w-12 bg-primary/50" />
            <span className="text-sm font-mono text-primary tracking-wide uppercase">
              Pricing
            </span>
            <div className="h-px w-12 bg-primary/50" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight mb-6"
          >
            Simple,{" "}
            <span className="text-primary">transparent</span> pricing
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground"
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
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`text-sm ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </span>
          
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`
              relative w-14 h-7 rounded-full transition-colors duration-300
              ${isAnnual ? "bg-primary" : "bg-border"}
            `}
          >
            <motion.div
              animate={{ x: isAnnual ? 28 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
            />
          </button>
          
          <span className={`text-sm ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Annual
          </span>
          
          {isAnnual && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
            >
              Save 20%
            </motion.span>
          )}
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className={`
                relative rounded-2xl p-8 border transition-all duration-300 flex flex-col
                ${plan.highlighted 
                  ? "bg-card border-primary/40 shadow-lg shadow-primary/5" 
                  : "bg-card/60 border-border/40 hover:border-border/60"
                }
              `}
            >
              {/* Highlighted badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-xl font-serif font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
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
                  <p className="text-sm text-muted-foreground mt-1">
                    ${plan.price.annual} billed annually
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className={`flex items-start gap-3 text-sm ${
                      feature.included ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    <Check 
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        feature.included ? "text-primary" : "text-muted-foreground/30"
                      }`} 
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={openAuthModal}
                className={`
                  block w-full py-3 px-6 rounded-full text-center font-medium transition-colors
                  ${plan.highlighted 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-card border border-border/60 text-foreground hover:bg-accent"
                  }
                `}
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
          className="text-center text-sm text-muted-foreground/60 mt-12"
        >
          No credit card required for free plan. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
