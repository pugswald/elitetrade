jQuery(function() {
    // TODO: Make this generic to use with all admin forms
    function clearCommodityForm(){
        $('#commodity-form')[0].reset();
        $('#commodity-admin-error').text("");
        $('#commodity-delete-button').button("option", "disabled", true);
        $('#commodity-put-button').button("option", "label", "Create Commodity");
    }

    function sendCommodity(e) {
        var thisform = $('#commodity-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Creating new commodity '+name);
        $.ajax({url:'/commodity',type:'put',data:thisform.serialize(),success: function(e){
                console.log('Ran put for commodity');
                console.log(e);
                if ( e.error ) {
                    $('#commodity-admin-error').text("Error: "+e.error);
                } else {
                    clearCommodityForm()
                    $('#commodity-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    function deleteCommodity(e) {
        var thisform = $('#commodity-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Deleting commodity '+name);
        $.ajax({url:'/commodity',type:'delete',data:thisform.serialize(),success: function(e){
                console.log('Ran delete for commodity');
                console.log(e);
                if ( e.error ) {
                    $('#commodity-admin-error').text("Error: "+e.error);
                } else {
                    clearCommodityForm()
                    $('#commodity-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    $('#commodity-form').submit(sendCommodity);
    $('#commodity-delete-button').click(deleteCommodity);
    $('#commodity-list').dataTable({
        "processing": true,
        "serverSide": true,
        "ajax": "/commodity",
        order: [1,'asc'],
        columns: [{ "visible": false }, null, null]
    });
    clearCommodityForm();
    $('#commodity-list').on( 'click', 'tr', function() {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');
            clearCommodityForm();
            //$('#commodity-delete-button').button("option", "disabled", true);
        } else {
            $('#commodity-list tr.selected').removeClass('selected');
            $(this).addClass('selected');
            $('#commodity-delete-button').button("option", "disabled", false);
            $('#commodity-put-button').button("option", "label", "Modify Commodity");
            //console.log( $('#commodity-delete-button'));
            var rowData = $('#commodity-list').DataTable().row( this ).data();
            if (rowData) { // Clicking outside of data form still triggers this
                var thisform = $('#commodity-form');
                thisform.find('input[name="id"]').val(rowData[0]);
                thisform.find('input[name="name"]').val(rowData[1]);
                thisform.find('input[name="galavg"]').val(rowData[2]);
                console.log(rowData);
            }
        }
    });
});