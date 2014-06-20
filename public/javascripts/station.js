jQuery(function() {
    function clearStationForm(){
        $('#station-form')[0].reset();
        $('#station-admin-error').text("");
        $('#station-delete-button').button("option", "disabled", true);
        $('#station-put-button').button("option", "label", "Create station");
    }

    function sendStation(e) {
        var thisform = $('#station-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Creating new station '+name);
        $.ajax({url:'/station',type:'put',data:thisform.serialize(),success: function(e){
                console.log('Ran put for station');
                console.log(e);
                if ( e.error ) {
                    $('#station-admin-error').text("Error: "+e.error);
                } else {
                    clearStationForm()
                    $('#station-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    function deleteStation(e) {
        var thisform = $('#station-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Deleting station '+name);
        $.ajax({url:'/station',type:'delete',data:thisform.serialize(),success: function(e){
                console.log('Ran delete for station');
                console.log(e);
                if ( e.error ) {
                    $('#station-admin-error').text("Error: "+e.error);
                } else {
                    clearStationForm()
                    $('#station-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    // Form bindings for station
    $('#station-form').submit(sendStation);
    $('#station-delete-button').click(deleteStation);
    $('#station-list').dataTable({
        "processing": true,
        "serverSide": true,
        "ajax": "/station",
        order: [1,'asc'],
        columns: [{ "visible": false }, null, null, null, null, null, { "visible": false }]
    });
    clearStationForm();
    $('#station-list').on( 'click', 'tr', function() {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');
            clearStationForm();
            //$('#station-delete-button').button("option", "disabled", true);
        } else {
            $('#station-list tr.selected').removeClass('selected');
            $(this).addClass('selected');
            $('#station-delete-button').button("option", "disabled", false);
            $('#station-put-button').button("option", "label", "Modify station");
            //console.log( $('#station-delete-button'));
            var rowData = $('#station-list').DataTable().row( this ).data();
            if (rowData) { // Clicking outside of data form still triggers this
                var thisform = $('#station-form');
                thisform.find('input[name="id"]').val(rowData[0]);
                thisform.find('input[name="name"]').val(rowData[1]);
                thisform.find('input[name="system"]').val(rowData[2]);
                thisform.find('input[name="x"]').val(rowData[3]);
                thisform.find('input[name="y"]').val(rowData[4]);
                thisform.find('input[name="z"]').val(rowData[5]);
                console.log(rowData);
            }
        }
    });
});
