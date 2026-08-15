<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Project;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            ['name' => 'Northline Residences', 'contact_name' => 'Maya Santos', 'type' => 'Residential', 'status' => 'In progress'],
            ['name' => 'Atelier Eight Studio', 'contact_name' => 'Daniel Cruz', 'type' => 'Commercial', 'status' => 'Ready for review'],
            ['name' => 'Harbour House', 'contact_name' => 'Sofia Reyes', 'type' => 'Hospitality', 'status' => 'Draft'],
        ];

        foreach ($clients as $clientData) {
            $client = Client::updateOrCreate(['name' => $clientData['name']], $clientData);

            Project::updateOrCreate(
                ['client_id' => $client->id, 'name' => 'Primary virtual tour'],
                [
                    'user_id' => 1,
                    'status' => $client->status,
                    'description' => "Scene workspace for {$client->name}",
                ]
            );
        }
    }
}
