<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Server-side field rules. Each method returns { field: 'message' } (empty = valid).
 * These are the same rules the React forms use, enforced again here because the browser can never be trusted.
 */
class Check
{
    private const EMAIL = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';

    private const NAME = "/^\p{L}[\p{L}\s.'-]*$/u";

    private const PHONE_CHARS = '/^[+\d\s()-]+$/';

    private const USERNAME = '/^[a-z0-9._-]+$/';

    public const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

    private static function s($values, string $key): string
    {
        $v = $values[$key] ?? '';

        return is_string($v) ? trim($v) : (is_scalar($v) ? trim((string) $v) : '');
    }

    public static function phoneIssue(string $value): ?string
    {
        $digits = strlen(preg_replace('/\D/', '', $value));
        if (! preg_match(self::PHONE_CHARS, $value) || $digits < 7 || $digits > 13) {
            return 'Enter a valid contact number, for example 0917 555 0101.';
        }

        return null;
    }

    public static function passwordIssue(string $password): ?string
    {
        if (mb_strlen($password) < 8) {
            return 'Use at least 8 characters.';
        }
        if (! preg_match('/[A-Za-z]/', $password) || ! preg_match('/\d/', $password)) {
            return 'Use both letters and numbers.';
        }

        return null;
    }

    public static function student(array $in, bool $requireDepartment = true): array
    {
        $e = [];
        $name = self::s($in, 'name');
        if ($name === '') {
            $e['name'] = "Enter the student's full name.";
        } elseif (mb_strlen($name) < 2 || ! preg_match(self::NAME, $name)) {
            $e['name'] = 'Use letters, spaces, periods, apostrophes or hyphens only.';
        }

        $email = self::s($in, 'email');
        if ($email === '') {
            $e['email'] = 'Enter an email address.';
        } elseif (! preg_match(self::EMAIL, $email) || strlen($email) > 255) {
            $e['email'] = 'Enter a valid email address, for example name@school.edu.';
        }

        $contact = self::s($in, 'contact');
        if ($contact === '') {
            $e['contact'] = 'Enter a contact number.';
        } elseif ($issue = self::phoneIssue($contact)) {
            $e['contact'] = $issue;
        }

        $birthdate = self::s($in, 'birthdate');
        if ($birthdate === '') {
            $e['birthdate'] = 'Select the birthday.';
        } else {
            try {
                $birth = Carbon::createFromFormat('Y-m-d', $birthdate)->startOfDay();
                if ($birth->format('Y-m-d') !== $birthdate || $birth->year < 1900) {
                    $e['birthdate'] = 'Enter a valid birthday.';
                } elseif ($birth->isFuture()) {
                    $e['birthdate'] = 'The birthday cannot be in the future.';
                }
            } catch (\Throwable) {
                $e['birthdate'] = 'Enter a valid birthday.';
            }
        }

        $address = self::s($in, 'address');
        if ($address === '') {
            $e['address'] = 'Enter the home address.';
        } elseif (mb_strlen($address) < 5) {
            $e['address'] = 'The address is too short.';
        } elseif (mb_strlen($address) > 255) {
            $e['address'] = 'The address is too long.';
        }

        $program = self::s($in, 'program');
        if ($program === '') {
            $e['program'] = 'Enter the program or course.';
        } elseif (mb_strlen($program) > 150) {
            $e['program'] = 'The program name is too long.';
        }

        $year = self::s($in, 'yearLevel');
        if ($year === '') {
            $e['yearLevel'] = 'Select a year level.';
        } elseif (! in_array($year, self::YEAR_LEVELS, true)) {
            $e['yearLevel'] = 'Select a valid year level.';
        }

        if ($requireDepartment && self::s($in, 'departmentId') === '') {
            $e['departmentId'] = 'Select a department.';
        }

        $emergencyContact = self::s($in, 'emergencyContact');
        if ($emergencyContact !== '' && ($issue = self::phoneIssue($emergencyContact))) {
            $e['emergencyContact'] = $issue;
        }
        $emergencyName = self::s($in, 'emergencyName');
        if ($emergencyName !== '' && (! preg_match(self::NAME, $emergencyName) || mb_strlen($emergencyName) > 150)) {
            $e['emergencyName'] = 'Use letters, spaces, periods, apostrophes or hyphens only.';
        }

        return $e;
    }

    public static function staff(array $in, bool $isNew = true): array
    {
        $e = [];
        $name = self::s($in, 'name');
        if ($name === '') {
            $e['name'] = "Enter the staff member's full name.";
        } elseif (mb_strlen($name) < 2 || ! preg_match(self::NAME, $name)) {
            $e['name'] = 'Use letters, spaces, periods, apostrophes or hyphens only.';
        }

        if ($isNew) {
            $username = strtolower(self::s($in, 'username'));
            if ($username === '') {
                $e['username'] = 'Enter a username.';
            } elseif (strlen($username) < 3) {
                $e['username'] = 'Use at least 3 characters.';
            } elseif (strlen($username) > 50 || ! preg_match(self::USERNAME, $username)) {
                $e['username'] = 'Use letters, numbers, dots, dashes or underscores only.';
            }
        }

        $email = self::s($in, 'email');
        if ($email === '') {
            $e['email'] = 'Enter an email address.';
        } elseif (! preg_match(self::EMAIL, $email) || strlen($email) > 255) {
            $e['email'] = 'Please enter a valid email address.';
        }

        $contact = self::s($in, 'contact');
        if ($contact !== '' && ($issue = self::phoneIssue($contact))) {
            $e['contact'] = $issue;
        }

        if ($isNew && self::s($in, 'role') === '') {
            $e['role'] = 'Select a role.';
        }

        return $e;
    }

    /** Only the fields present in $in are checked. */
    public static function profile(array $in, bool $canEditName = false): array
    {
        $e = [];
        if ($canEditName && array_key_exists('name', $in)) {
            $name = self::s($in, 'name');
            if ($name === '') {
                $e['name'] = 'Enter your full name.';
            } elseif (mb_strlen($name) < 2 || ! preg_match(self::NAME, $name)) {
                $e['name'] = 'Use letters, spaces, periods, apostrophes or hyphens only.';
            }
        }
        if (array_key_exists('email', $in)) {
            $email = self::s($in, 'email');
            if ($email === '') {
                $e['email'] = 'Enter an email address.';
            } elseif (! preg_match(self::EMAIL, $email) || strlen($email) > 255) {
                $e['email'] = 'Enter a valid email address, for example name@school.edu.';
            }
        }
        if (array_key_exists('contact', $in)) {
            $contact = self::s($in, 'contact');
            if ($contact === '') {
                $e['contact'] = 'Enter a contact number.';
            } elseif ($issue = self::phoneIssue($contact)) {
                $e['contact'] = $issue;
            }
        }

        return $e;
    }
}
