<?php

namespace App\Domains\Contacts\Controllers;

use App\Domains\Contacts\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContactsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Datas relativas (aniversários) calculadas no fuso do usuário, não em UTC.
        $tz    = $user->timezone ?? 'America/Sao_Paulo';
        $today = \Illuminate\Support\Carbon::now($tz)->startOfDay();

        $contacts = Contact::where('user_id', $user->id)
            ->orderBy('name')
            ->get()
            ->map(function ($c) use ($tz, $today) {
                $initials = collect(explode(' ', $c->name))
                    ->reject(fn($p) => preg_match('/^\p{L}{1,3}\.$/u', $p))
                    ->map(fn($p) => mb_substr($p, 0, 1))
                    ->take(2)
                    ->implode('');

                $upcomingBirthday = null;
                if ($c->birthday) {
                    $month = $c->birthday->month;
                    $daysInMonth = \Illuminate\Support\Carbon::create($today->year, $month, 1)->daysInMonth;
                    // Cria a data no mesmo fuso de $today, para o diffInDays não sofrer drift de horas.
                    $thisYear = \Illuminate\Support\Carbon::create($today->year, $month, min($c->birthday->day, $daysInMonth), 0, 0, 0, $tz);
                    $next = $thisYear->lt($today) ? $thisYear->copy()->addYear() : $thisYear;
                    $upcomingBirthday = [
                        'date'      => $next->format('d/m'),
                        'days_away' => (int) $today->diffInDays($next, true),
                    ];
                }

                return [
                    'id'        => $c->id,
                    'name'      => $c->name,
                    'initials'  => mb_strtoupper($initials),
                    'email'     => $c->email,
                    'phone'     => $c->phone,
                    'photo'     => $c->photo,
                    'birthday'  => $c->birthday?->format('d/m/Y'),
                    'context'   => $c->context,
                    'next_step' => $c->next_step,
                    'last_contacted_at' => $c->last_contacted_at?->format('d/m/Y'),
                    'last_contacted_relative' => $c->last_contacted_at?->diffForHumans(),
                    'remind_after_days' => $c->remind_after_days,
                    'notes'     => $c->notes,
                    'upcoming_birthday' => $upcomingBirthday,
                ];
            })
            ->values()
            ->toArray();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedData($request);
        Contact::create(array_merge(['user_id' => $request->user()->id], $validated));

        return redirect()->route('contacts')->with('success', 'Contato criado.');
    }

    public function update(Request $request, int $contact): RedirectResponse
    {
        $model = Contact::where('user_id', $request->user()->id)
            ->where('id', $contact)
            ->firstOrFail();
        $model->update($this->validatedData($request));

        return redirect()->route('contacts')->with('success', 'Contato atualizado.');
    }

    public function destroy(Request $request, int $contact): RedirectResponse
    {
        Contact::where('user_id', $request->user()->id)
            ->where('id', $contact)
            ->firstOrFail()
            ->delete();

        return redirect()->route('contacts')->with('success', 'Contato excluído.');
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name'              => 'required|string|max:255',
            'email'             => 'nullable|email|max:255',
            'phone'             => 'nullable|string|max:32',
            'birthday'          => 'nullable|date|before_or_equal:today',
            'context'           => ['nullable', 'string', Rule::in(['Família', 'Trabalho', 'Saúde', 'Casa'])],
            'next_step'         => 'nullable|string|max:255',
            'last_contacted_at' => 'nullable|date|before_or_equal:today',
            'remind_after_days' => 'nullable|integer|min:1|max:365',
            'notes'             => 'nullable|string',
        ]);
    }
}
