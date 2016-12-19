<?php

use Illuminate\Database\Seeder;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        //
        DB::table('users')->insert([[
            'name' => "rsmas",
            'email' => "rsmas".'@gmail.com',
            'isAdmin' => 1,
            'password' => bcrypt('rsmastest')
        ], [
        	'name' => "rsmas2",
            'email' => "rsmas2".'@gmail.com',
            'isAdmin' => 0,
            'password' => bcrypt('rsmas2test')
        ]]);
    }
}
