<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DesignShowcaseController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Dev/Design');
    }
}
