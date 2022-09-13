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
            'name' => "insarmaps",
            'email' => "insarmaps".'@insarmaps.com',
            'isAdmin' => 1,
            'password' => bcrypt('rsmastest')
        ]]);
    }
}
