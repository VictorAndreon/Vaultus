<?php

namespace App\Domains\Library\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class LibraryController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Stub/Index', ['module' => 'library']);
    }
}
