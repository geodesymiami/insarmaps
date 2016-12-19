$(window).on("load", function() {
    $(".table-buttons").on("click", function(event) {
        var index = event.target.id;

        var user = userPermissions[index].user;
        var newPermissions = $("#permRow-" + index).val().split(" ");

        $.ajax({
            type: "POST",
            url: "/adminPanel/setPermissions",
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
        // might want to just do a regular form? or stick to ajax?
        // add a loading popup later if he wants.
        $.ajax({
            type: "POST",
            url: "/auth/remove-users",
            data: {
                users: checkedValues
            },
            success: function(response) {
                for (var i = 0; i < checkedValues.length; i++) {
                    value = checkedValues[i];

                    $("#row-" + value).remove();
                }
            },
            error: function(xhr, ajaxOptions, thrownError) {
                alert("There was a fatal error while removing the users. Reloading the page...");
                location.reload();
            }
        });
    });

    $("#add-user-button").on("click", function(event) {
        location.href = "/auth/register";
    });
});
