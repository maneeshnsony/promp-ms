<?php

namespace App\Libraries;

/**
 * Static holder for the current request's authenticated claims. Safe under
 * PHP-FPM's one-request-per-process model — state never leaks across requests.
 */
class AuthContext
{
    private static ?object $claims = null;

    public static function set(object $claims): void
    {
        self::$claims = $claims;
    }

    public static function id(): ?int
    {
        return self::$claims->sub ?? null;
    }

    public static function email(): ?string
    {
        return self::$claims->email ?? null;
    }
}
