<?php

namespace App\Domains\Notes\Controllers;

use App\Domains\Notes\Models\Notebook;
use App\Domains\Notes\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class NotesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notebooks = Notebook::where('user_id', $user->id)
            ->orderBy('name')
            ->get()
            ->map(fn($nb) => [
                'id'    => $nb->id,
                'name'  => $nb->name,
                'color' => $nb->color,
            ])
            ->values()
            ->toArray();

        $notes = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
            ->with('notebook:id,name,color')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($n) => [
                'id'           => $n->id,
                'notebook_id'  => $n->notebook_id,
                'notebook_name'=> $n->notebook->name,
                'notebook_color' => $n->notebook->color,
                'title'        => $n->title,
                'content'      => $n->content,
                'is_sensitive' => $n->is_sensitive,
                'tags'         => $n->tags ?? [],
                'updated_at'   => $n->updated_at->format('d/m/Y H:i'),
                'updated_at_relative' => $n->updated_at->diffForHumans(),
            ])
            ->values()
            ->toArray();

        return Inertia::render('Notes/Index', [
            'notebooks' => $notebooks,
            'notes'     => $notes,
        ]);
    }
}
