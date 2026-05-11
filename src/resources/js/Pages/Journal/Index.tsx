import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { JournalEntry, JournalPrompt } from '@/types'
import JournalCalendar from './components/JournalCalendar'
import EntryList from './components/EntryList'
import EntryEditor from './components/EntryEditor'
import PromptsPanel from './components/PromptsPanel'
import Button from '@/Components/ui/Button'

interface Props {
    entries: JournalEntry[]
    prompts: JournalPrompt[]
    today: string
}

export default function JournalIndex({ entries, prompts, today }: Props) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const currentEntry = selectedDate
        ? entries.find(e => e.date === selectedDate) ?? null
        : null

    return (
        <AppLayout title="Diário">
            <div className="max-w-2xl space-y-4">
                {selectedDate ? (
                    <>
                        <PromptsPanel prompts={prompts} />
                        <EntryEditor
                            entry={currentEntry}
                            selectedDate={selectedDate}
                            onBack={() => setSelectedDate(null)}
                        />
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                Diário Pessoal
                            </h2>
                            <Button size="sm" onClick={() => setSelectedDate(today)}>
                                Escrever hoje
                            </Button>
                        </div>
                        <JournalCalendar
                            entries={entries}
                            today={today}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                        <EntryList
                            entries={entries}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    )
}
