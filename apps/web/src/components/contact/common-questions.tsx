import { FAQ_QUESTIONS } from "@/data/contact-data";

/**
 * Questions only, no answer copy — several touch unconfirmed claims (COD,
 * pan-India shipping, delivery timeframes) that must not be asserted until
 * confirmed. See docs/DESIGN_SYSTEM.md §18.
 */
export function CommonQuestions() {
  return (
    <section className="bg-[#FFF5E8] pb-12 pt-14 sm:py-16 lg:pb-22 lg:pt-20">
      <div className="mx-auto w-full max-w-[1230px] px-6 sm:px-8 lg:px-0">
        <h2
          className="text-[2.35rem] leading-none tracking-[-0.03em] text-text-primary sm:text-[2.75rem] lg:text-[3rem]"
          style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
        >
          Common questions
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:mt-9 lg:gap-y-9">
          {FAQ_QUESTIONS.map((question) => (
            <li
              key={question}
              className="flex min-h-[58px] items-center gap-7 rounded-b-[24px] rounded-t-[8px] bg-[#FFFAF3] px-7 py-3 text-[1.1rem] leading-tight text-text-primary shadow-[0_15px_18px_rgba(92,57,34,0.06)] sm:text-[1.2rem]"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-text-primary" aria-hidden="true" />
              {question}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}