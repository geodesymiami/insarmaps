<?php

use Illuminate\Database\Seeder;

class UserPermissionsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // 
        DB::table('user_permissions')->insert([
            'user_id' => 1,
            'permission' => "rsmas"
        ]);
    }
}
