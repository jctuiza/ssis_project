<?php

namespace App\Support;

use Carbon\Carbon;

/** Display formats that match the ones the React pages already use (Oct 04, 2026 · 3:05 PM). */
class Fmt
{
    public static function date($value): string
    {
        return $value ? Carbon::parse($value)->format('M d, Y') : '—';
    }

    public static function dateTime($value): string
    {
        return $value ? Carbon::parse($value)->format('M d, Y').' · '.Carbon::parse($value)->format('g:i A') : '—';
    }

    public static function longDate($value): string
    {
        return $value ? Carbon::parse($value)->format('F d, Y') : '—';
    }

    public static function peso($amount): string
    {
        return '₱'.number_format((float) $amount, 2);
    }

    public static function timeAgo($value): string
    {
        $minutes = intdiv(max(0, time() - Carbon::parse($value)->getTimestamp()), 60);
        if ($minutes < 1) {
            return 'Just now';
        }
        if ($minutes < 60) {
            return "{$minutes} min ago";
        }
        $hours = intdiv($minutes, 60);
        if ($hours < 24) {
            return "{$hours} hour".($hours === 1 ? '' : 's').' ago';
        }
        $days = intdiv($hours, 24);
        if ($days === 1) {
            return 'Yesterday';
        }
        if ($days < 14) {
            return "{$days} days ago";
        }

        return self::date($value);
    }
}
