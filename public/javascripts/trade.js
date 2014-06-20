jQuery(function() {
    function clearTradeForm(){
        $('#trade-form')[0].reset();
        $('#trade-admin-error').text("");
        $('#trade-delete-button').button("option", "disabled", true);
        $('#trade-put-button').button("option", "label", "Enter New trade");
    }

    function sendTrade(e) {
        var thisform = $('#trade-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Creating new trade '+name);
        $.ajax({url:'/trade',type:'put',data:thisform.serialize(),success: function(e){
                console.log('Ran put for trade');
                console.log(e);
                if ( e.error ) {
                    $('#trade-admin-error').text("Error: "+e.error);
                } else {
                    clearTradeForm()
                    $('#trade-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    function deleteTrade(e) {
        var thisform = $('#trade-form');
        var name = thisform.find('input[name="name"]').val();
        console.log('Deleting trade '+name);
        $.ajax({url:'/trade',type:'delete',data:thisform.serialize(),success: function(e){
                console.log('Ran delete for trade');
                console.log(e);
                if ( e.error ) {
                    $('#trade-admin-error').text("Error: "+e.error);
                } else {
                    clearTradeForm()
                    $('#trade-list').DataTable().draw();
                }
            }
        });
        return false;
    }
    // Form bindings for trade
    $('#trade-form').submit(sendTrade);
    $('#trade-delete-button').click(deleteTrade);
    $('#trade-list').dataTable({
        "processing": true,
        "serverSide": true,
        "ajax": "/trade",
        order: [2,'desc'],
        columns: [{ "visible": false }, {"visible": false}, null, null, null, null, null, null, null]
    });
    clearTradeForm();
    $('#trade-list').on( 'click', 'tr', function() {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');
            clearTradeForm();
            //$('#trade-delete-button').button("option", "disabled", true);
        } else {
            $('#trade-list tr.selected').removeClass('selected');
            $(this).addClass('selected');
            $('#trade-delete-button').button("option", "disabled", false);
            $('#trade-put-button').button("option", "label", "Modify trade");
            //console.log( $('#trade-delete-button'));
            var rowData = $('#trade-list').DataTable().row( this ).data();
            if (rowData) { // Clicking outside of data form still triggers this
                var thisform = $('#trade-form');
                thisform.find('input[name="id"]').val(rowData[0]);
                thisform.find('input[name="station"]').val(rowData[3]);
                thisform.find('input[name="commodity"]').val(rowData[4]);
                thisform.find('input[name="amount"]').val(rowData[5]);
                thisform.find('input[name="price"]').val(rowData[6]);
                thisform.find('input[name="action"]').val(rowData[7]);
                console.log(rowData);
            }
        }
    });
});