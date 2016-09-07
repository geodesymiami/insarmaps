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
});
