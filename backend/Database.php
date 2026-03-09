<?php

declare(strict_types=1);

final class Database
{
    private PDO $connection;

    public function __construct(array $config)
    {
        $db = $config['db'];
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            $db['host'],
            $db['port'],
            $db['dbname']
        );

        $this->connection = new PDO($dsn, $db['user'], $db['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    public function pdo(): PDO
    {
        return $this->connection;
    }
}
