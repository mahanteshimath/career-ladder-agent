import { PRICING_TIERS } from "@/config/tiers";

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`
            relative border rounded-2xl p-8 flex flex-col transition-all hover:shadow-lg
            ${tier.name === "premium"
              ? "border-blue-500 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/50 scale-[1.02]"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }
          `}
        >
          {tier.name === "premium" && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
              Most Popular
            </span>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {tier.displayName}
          </h3>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              {tier.price}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              {tier.priceSubtext}
            </span>
          </div>
          <ul className="mt-6 space-y-3 flex-1">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300"
              >
                <svg
                  className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            className={`
              mt-8 w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all
              ${tier.name === "premium"
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                : tier.name === "basic"
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
                  : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }
            `}
          >
            {tier.name === "free" ? "Get Started Free" : "Subscribe Now"}
          </button>
        </div>
      ))}
    </div>
  );
}
