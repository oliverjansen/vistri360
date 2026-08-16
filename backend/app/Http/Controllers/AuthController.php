<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::with('roles')->where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $token = $user->createToken('web')->accessToken;
        Activity::log('login', $request);

        return response()->json(['data' => ['token' => $token, 'user' => $user]]);
    }

    public function logout(Request $request)
    {
        $request->user()->token()?->revoke();
        Activity::log('logout', $request);
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $request->user()->load('roles')]);
    }
}
