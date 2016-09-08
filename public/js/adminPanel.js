$(window).on("load", function() {
    $(".table-buttons").on("click", function(event) {
        var index = event.target.id;

        var user = userPermissions[index].user;
        var newPermissions = $("#row-" + index).val().split(" ");

        $.ajax({
            type: "POST",
            url: "/adminPanel/setPermissions/",
            data: {
                id: user.id,
                newPermissions: newPermissions
            },
            success: function(response) {
                alert(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                alert("There was a fatal error while setting permissions");
            }
        });
    });

    $("#remove-user-button").on("click", function(event) {
        var checkedValues = $('input[name=selected-users]:checked').map(function() {
            return parseInt($(this).val());
        }).get();
        console.log(checkedValues);
        $.ajax({
            type: "POST",
            url: "/auth/remove-users",
            data: {
                users: checkedValues
            },
            success: function(response) {
                console.log(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                alert("There was a fatal error while removing the users");
            }
        });
    });
});
