import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import ConfirmDialog, { ConfirmOptions } from './ConfirmDialog'
import InputDialog, { PromptOptions } from './InputDialog'

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

interface PromptState extends PromptOptions {
  resolve: (value: string | null) => void
}

interface DialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  prompt: (opts: PromptOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [promptState, setPromptState] = useState<PromptState | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  )

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => setPromptState({ ...opts, resolve })),
    [],
  )

  function settleConfirm(value: boolean) {
    confirmState?.resolve(value)
    setConfirmState(null)
  }

  function settlePrompt(value: string | null) {
    promptState?.resolve(value)
    setPromptState(null)
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onConfirm={() => settleConfirm(true)}
          onCancel={() => settleConfirm(false)}
        />
      )}
      {promptState && (
        <InputDialog
          {...promptState}
          onConfirm={(value) => settlePrompt(value)}
          onCancel={() => settlePrompt(null)}
        />
      )}
    </DialogContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <DialogProvider>')
  return ctx.confirm
}

export function usePrompt() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('usePrompt precisa estar dentro de <DialogProvider>')
  return ctx.prompt
}
