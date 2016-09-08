<?php

namespace App\Http\Controllers\Auth;

use App\User;
use Validator;
use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\ThrottlesLogins;
use Illuminate\Foundation\Auth\AuthenticatesAndRegistersUsers;
use Auth;
use Session;
use App\Http\Requests;
use Illuminate\Http\Request;
use DB;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Registration & Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles the registration of new users, as well as the
    | authentication of existing users. By default, this controller uses
    | a simple trait to add these behaviors. Why don't you explore it?
    |
    */

    use AuthenticatesAndRegistersUsers, ThrottlesLogins;

    /**
     * Where to redirect users after login / registration.
     *
     * @var string
     */
    protected $redirectTo = '/';

    /**
     * Create a new authentication controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        //$this->middleware($this->guestMiddleware(), ['except' => ['logout', 'getLogout']]);
    }

    /**
     * Get a validator for an incoming registration request.
     *
     * @param  array  $data
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function validator(array $data)
    {
        return Validator::make($data, [
            'name' => 'required|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|min:6|confirmed',
        ]);
    }

    /**
     * Create a new user instance after a valid registration.
     *
     * @param  array  $data
     * @return User
     */
    protected function create(array $data)
    {

        throw new Exception("Registration disabled");

        return null;
        // return User::create([
        //     'name' => $data['name'],
        //     'email' => $data['email'],
        //     'password' => bcrypt($data['password']),
        // ]);
    }

    // don't allow registration for now
    public function getRegister() {
        return redirect("/auth/login");

    }

    public function postRegister() {        
        return;
    }

    public function postRemoveUsers(Request $request) {
        $userIDs = $request->input("users");
        $sql = "DELETE FROM users WHERE id IN (";

        $userIDBindings = [];

        foreach ($userIDs as $userID) {
            $sql = $sql . "?,";
            array_push($userIDBindings, $userID);
        }

        $sql = rtrim($sql, ",");
        $sql = $sql . ")";

        DB::delete($sql, $userIDBindings);

        return redirect("/adminPanel");
    }
}
