<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Notes\Models\Notebook;
use App\Domains\Notes\Models\Note;
use Illuminate\Database\Seeder;

class NotesSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        $books = [
            ['name' => 'Design',     'color' => '#7ec27b'],
            ['name' => 'Pesquisa',   'color' => '#d4a55a'],
            ['name' => 'Inbox',      'color' => '#7faecf'],
        ];

        $notes = [
            'Design' => [
                ['title' => 'Princípios do Vaultus', 'content' => "Decisão antes de ornamento.\n\nVerde é a única cor com chroma alto — todo o resto é neutro.\n\nSerif para o que importa; mono para o que se conta.", 'tags' => ['design', 'princípios']],
                ['title' => 'Tipografia editorial', 'content' => "Instrument Serif para headings de display. Geist Mono para metadata e números. Geist Sans para corpo.\n\nNunca misturar dois pesos da serif.", 'tags' => ['tipografia', 'design']],
                ['title' => 'OKLCH vs HSL',       'content' => "OKLCH garante linearidade perceptiva — derivar tons fica trivial. HSL não.", 'tags' => ['cor', 'oklch']],
                ['title' => 'Quando usar GoalIcon vs GradientAvatar', 'content' => "GoalIcon: representação categórica (metas, contas). GradientAvatar: pessoas físicas.", 'tags' => ['ícones']],
            ],
            'Pesquisa' => [
                ['title' => 'Atomic habits — chave',     'content' => "Identidade > Processo > Resultado.\n\nSistemas, não metas.", 'tags' => ['leitura', 'hábitos']],
                ['title' => 'Deep Work — capítulo 2',   'content' => "Foco como meta-skill da economia moderna.\n\nSchedule deep work blocks.", 'tags' => ['leitura', 'foco']],
                ['title' => 'Notas sobre OKRs',          'content' => "Objectives: qualitativos, motivacionais. Key results: mensuráveis, com prazo.", 'tags' => ['gestão']],
                ['title' => 'Sistemas de revisão',       'content' => "Revisão semanal: 30 min, sextas. Mensal: 1h. Trimestral: 2h.", 'tags' => ['reflexão']],
            ],
            'Inbox' => [
                ['title' => 'Comprar ração',             'content' => "Acabou ontem. Marca azul, 7kg.", 'tags' => ['tarefa']],
                ['title' => 'Ligar pro contador',        'content' => "Sobre o IR — pendência desde abril.", 'tags' => ['tarefa']],
                ['title' => 'Ideia: timer pomodoro',     'content' => "Componente custom no Vaultus, sem dependência externa.", 'tags' => ['ideia', 'código']],
                ['title' => 'Livro recomendado',         'content' => "\"The Beginning of Infinity\" — David Deutsch. Adicionar à fila.", 'tags' => ['leitura']],
            ],
        ];

        foreach ($books as $bookData) {
            $notebook = Notebook::factory()->create([
                'user_id' => $user->id,
                'name'    => $bookData['name'],
                'color'   => $bookData['color'],
            ]);

            foreach ($notes[$bookData['name']] as $noteData) {
                Note::factory()->create([
                    'notebook_id'  => $notebook->id,
                    'title'        => $noteData['title'],
                    'content'      => $noteData['content'],
                    'is_sensitive' => false,
                    'tags'         => $noteData['tags'],
                ]);
            }
        }
    }
}
