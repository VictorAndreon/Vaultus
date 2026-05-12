<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'                      => $request->user()->id,
                    'name'                    => $request->user()->name,
                    'email'                   => $request->user()->email,
                    'timezone'                => $request->user()->timezone,
                    'two_factor_confirmed_at' => $request->user()->two_factor_confirmed_at,
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}
