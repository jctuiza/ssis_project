<?php

namespace App\Exceptions;

use Exception;

/**
 * An error the React app can show as-is. $fields is an optional { field: 'message' } map
 * (the same shape the forms already use to print a message under each input).
 */
class ApiError extends Exception
{
    public function __construct(string $message, public int $status = 422, public ?array $fields = null)
    {
        parent::__construct($message);
    }

    public function render()
    {
        return response()->json(
            ['message' => $this->getMessage()] + ($this->fields ? ['errors' => $this->fields] : []),
            $this->status,
        );
    }
}
