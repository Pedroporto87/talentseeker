"use client";

import {
  startTransition,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const TOUR_STORAGE_KEY = "talentseeker-tour-completed";

type TourStep = {
  title: string;
  description: string;
  route: string;
  hint: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Visao geral",
    description:
      "O Dashboard mostra o volume de curriculos, vagas abertas, perfis prontos e distribuicao do funil.",
    route: "/",
    hint: "Use esta tela para apresentar rapidamente o valor da solucao para os avaliadores.",
  },
  {
    title: "Cadastro de vagas",
    description:
      "Em Vagas, o RH cadastra titulo, descricao e palavras-chave que servem de base para a busca semantica.",
    route: "/vagas",
    hint: "O ideal e criar a vaga antes de enviar os curriculos para o matching fazer sentido na demonstracao.",
  },
  {
    title: "Biblioteca de curriculos",
    description:
      "Em Curriculos, e possivel anexar arquivos PDF ou DOCX, acompanhar o status da ingestao e limpar tentativas.",
    route: "/curriculos",
    hint: "Use essa tela para acompanhar se os arquivos enviados foram recebidos, processados e indexados corretamente.",
  },
  {
    title: "Executar o matching",
    description:
      "Depois de criar uma vaga, abra o detalhe dela e clique em Rodar matching para gerar o ranking dos candidatos mais aderentes.",
    route: "/vagas",
    hint: "O matching cruza a vaga com os curriculos indexados e gera justificativas para apoiar a triagem.",
  },
  {
    title: "Ranking inteligente",
    description:
      "Em Ranking, o RH visualiza os candidatos priorizados, com nota de aderencia e justificativa resumida.",
    route: "/ranking",
    hint: "Essa tela e ideal para demonstrar como a IA ajuda a reduzir o tempo da triagem inicial.",
  },
  {
    title: "Pipeline do processo",
    description:
      "Em Pipeline, os candidatos podem ser movidos entre aderente, triagem, entrevista inicial, entrevista tecnica e contratado.",
    route: "/pipeline",
    hint: "A troca de etapa aparece na hora para deixar a demonstracao mais fluida e intuitiva.",
  },
];

export function GuidedTour({
  forceOpen,
  onClose,
}: {
  forceOpen: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = TOUR_STEPS[stepIndex];
  const shouldAutoOpen =
    hydrated &&
    !dismissed &&
    !window.localStorage.getItem(TOUR_STORAGE_KEY);
  const open = !dismissed && (forceOpen || shouldAutoOpen);
  const progressLabel = useMemo(
    () => `${stepIndex + 1} de ${TOUR_STEPS.length}`,
    [stepIndex],
  );
  const currentRoute = getStepRoute(currentStep);
  const isOnStepRoute = pathname === currentRoute;

  function getStepRoute(step: TourStep) {
    if (step.title === "Executar o matching" && pathname.startsWith("/vagas/")) {
      return pathname;
    }

    return step.route;
  }

  function closeTour(markCompleted = true) {
    if (markCompleted && hydrated) {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }
    setDismissed(true);
    onClose?.();
  }

  function handleNext() {
    if (stepIndex === TOUR_STEPS.length - 1) {
      startTransition(() => {
        router.push("/");
      });
      closeTour(true);
      return;
    }

    const nextIndex = stepIndex + 1;
    const nextStep = TOUR_STEPS[nextIndex];

    setStepIndex(nextIndex);
    startTransition(() => {
      router.push(getStepRoute(nextStep));
    });
  }

  function handlePrevious() {
    const previousIndex = Math.max(0, stepIndex - 1);
    const previousStep = TOUR_STEPS[previousIndex];

    setStepIndex(previousIndex);
    startTransition(() => {
      router.push(getStepRoute(previousStep));
    });
  }

  function navigateToStep() {
    startTransition(() => {
      router.push(currentRoute);
    });
  }

  if (!hydrated || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0b1f1a]/55 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/60 bg-[#fffaf2] p-6 shadow-[0_25px_70px_rgba(10,23,19,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#163f35]/60">
              Roteiro guiado
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
              {currentStep.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => closeTour(true)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Fechar
          </button>
        </div>

        <div className="mt-5 rounded-[24px] bg-white px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#163f35]/55">
            Passo {progressLabel}
          </p>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {currentStep.description}
          </p>
          <p className="mt-4 rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm text-slate-700">
            {currentStep.hint}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TOUR_STEPS.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => {
                setStepIndex(index);
                startTransition(() => {
                  router.push(getStepRoute(step));
                });
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                index === stepIndex
                  ? "bg-[#163f35] text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-600">
            {isOnStepRoute
              ? "Voce ja esta na pagina certa para este passo."
              : `Pagina sugerida para este passo: ${currentRoute}`}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => closeTour(true)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Encerrar roteiro
            </button>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrevious}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Voltar
              </button>
            ) : null}
            {!isOnStepRoute ? (
              <button
                type="button"
                onClick={navigateToStep}
                className="rounded-full bg-[#f3efe6] px-4 py-2 text-sm font-semibold text-[#163f35]"
              >
                Ir para a pagina
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-[#163f35] px-4 py-2 text-sm font-semibold text-white"
            >
              {stepIndex === TOUR_STEPS.length - 1 ? "Concluir" : "Proximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
