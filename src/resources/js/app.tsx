import '../css/app.css'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import { DialogProvider } from '@/Components/dialogs/DialogProvider'

createInertiaApp({
    resolve: (name) => {
        // glob eager devolve módulos como `unknown`; cada página exporta um componente em `default`.
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
        return pages[`./Pages/${name}.tsx`] as { default: ComponentType }
    },
    setup({ el, App, props }) {
        // DialogProvider precisa envolver TODA página (Inertia troca só o componente de App),
        // por isso fica na raiz e não no AppLayout — senão useConfirm/usePrompt chamados no
        // corpo da página ficariam acima do Provider e quebrariam.
        createRoot(el).render(
            <DialogProvider>
                <App {...props} />
            </DialogProvider>,
        )
    },
    progress: { color: '#5aab7a' },
})
