import { FAQ_ITEMS } from "@/data/contact-data";

export function CommonQuestions() {
  return (
    <section className="bg-[#FFF5E8] pb-12 pt-14 sm:py-16 lg:pb-22 lg:pt-20">
      <div className="site-container">
        <h2
          className="text-[2.35rem] leading-none tracking-[-0.03em] text-text-primary sm:text-[2.75rem] lg:text-[3rem]"
          style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
        >
          Common questions
        </h2>
        <ul className="mt-8 grid grid-cols-1 items-start gap-x-5 gap-y-7 sm:grid-cols-2 lg:mt-9 lg:gap-y-9">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <li key={question} className="self-start">
              <details className="group h-auto w-full rounded-[24px] border border-[#E7CFB9]/50 bg-[#FFFAF3] shadow-[0_15px_18px_rgba(92,57,34,0.06)]">
                <summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-5 px-7 py-3 text-[1.1rem] leading-tight text-text-primary focus-visible:outline-offset-[-3px] sm:text-[1.2rem] [&::-webkit-details-marker]:hidden">
                  <span
                    className="flex-1"
                    style={{ fontFamily: "var(--font-display-italic)" }}
                  >
                    {question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach-hero text-xl leading-none transition-transform duration-150 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mx-7 whitespace-normal break-words border-t border-deep-brown/10 pb-6 pt-4 text-[14px] leading-[1.65] text-text-primary/75">
                  {answer}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
