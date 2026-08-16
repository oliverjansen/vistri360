<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->notifications()->latest()->limit(30)->get()]);
    }

    public function read(Request $request, int $notification)
    {
        $item = $request->user()->notifications()->findOrFail($notification);
        $item->update(['read_at' => now()]);
        return response()->json(['message' => 'Notification marked as read.']);
    }
}
