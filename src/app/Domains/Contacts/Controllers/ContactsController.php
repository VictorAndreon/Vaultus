<?php

namespace App\Domains\Contacts\Controllers;

use App\Domains\Contacts\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ContactsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $contacts = Contact::where('user_id', $user->id)
            ->orderBy('name')
            ->get()
            ->map(function ($c) {
                $initials = collect(explode(' ', $c->name))
                    ->map(fn($p) => mb_substr($p, 0, 1))
                    ->take(2)
                    ->implode('');

                $upcomingBirthday = null;
                if ($c->birthday) {
                    $thisYear = $c->birthday->copy()->setYear(now()->year);
                    $next = $thisYear->isPast() ? $thisYear->addYear() : $thisYear;
                    $upcomingBirthday = [
                        'date'      => $next->format('d/m'),
                        'days_away' => (int) now()->startOfDay()->diffInDays($next, false),
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
}
