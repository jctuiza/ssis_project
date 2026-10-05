<?php

use Illuminate\Support\Facades\Route;

// One page serves the whole React app; React Router handles /student/home, /admin/users and so on.
// /api, /up (health check) and static files are never caught by this route.
Route::view('/{any?}', 'app')->where('any', '^(?!api(/|$)|up$|build/|storage/).*$');
