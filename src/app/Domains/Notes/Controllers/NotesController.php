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
    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'notebook_id' => 'required|integer',
            'title'       => 'required|string|max:255',
            'content'     => 'required|string',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string|max:50',
        ]);

        $notebook = Notebook::where('user_id', $user->id)
            ->where('id', $validated['notebook_id'])
            ->firstOrFail();

        Note::create([
            'notebook_id'  => $notebook->id,
            'title'        => $validated['title'],
            'content'      => $validated['content'],
            'is_sensitive' => false,
            'tags'         => $validated['tags'] ?? [],
        ]);

        return redirect()->route('notes');
    }

    public function update(Request $request, int $note)
    {
        $user = $request->user();
        $noteModel = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
            ->where('id', $note)
            ->firstOrFail();

        $validated = $request->validate([
            'title'   => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'tags'    => 'sometimes|array',
            'tags.*'  => 'string|max:50',
        ]);

        if (isset($validated['content']) && $validated['content'] !== $noteModel->content) {
            \App\Domains\Notes\Models\NoteVersion::create([
                'note_id'    => $noteModel->id,
                'content'    => $noteModel->content,
                'created_at' => now(),
            ]);
        }

        $noteModel->update($validated);

        return redirect()->route('notes');
    }

    public function destroy(Request $request, int $note)
    {
        $user = $request->user();
        $noteModel = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
            ->where('id', $note)
            ->firstOrFail();

        $noteModel->delete();

        return redirect()->route('notes');
    }

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
