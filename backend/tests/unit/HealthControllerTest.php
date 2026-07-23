<?php

use App\Controllers\Api\V1\HealthController;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;

/**
 * @internal
 */
final class HealthControllerTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testHealthEndpointReturns200WhenDatabaseIsUp(): void
    {
        $result = $this->get('api/v1/health');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);

        $this->assertSame('success', $body['status']);
        $this->assertSame('up', $body['data']['db']);
        $this->assertSame('prompt-ms-api', $body['data']['service']);
    }

    public function testHealthEndpointReturns503WhenDatabaseIsDown(): void
    {
        $controller = new class () extends HealthController {
            protected function isDatabaseUp(): bool
            {
                return false;
            }
        };

        $controller->initController(Services::incomingrequest(null, false), Services::response(), Services::logger());

        $response = $controller->index();

        $this->assertSame(503, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);

        $this->assertSame('error', $body['status']);
        $this->assertSame('down', $body['data']['db']);
        $this->assertSame('Database unreachable', $body['message']);
    }
}
