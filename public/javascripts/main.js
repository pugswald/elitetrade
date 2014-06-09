// Fourth social scripting

// The unencrypted private key is stored as a window variable as there is
// no easy way to store it in localStorage.  Too many objects within 
// objects to unserialize without a lot of work.
var pk_clear = null; // TODO move into a class
var user = null; // TODO move into a class
var decrypting = false; // TODO move into event handling
$( init );

function init(){
  if ((!window.crypto) || (!window.crypto.getRandomValues)) {
    // TODO: Error message for user 
    var err_dialog = $('<div>');
    err_dialog.attr('title','Incompatible Browser');
    err_dialog.append('<p>Your broswer does not support the required functions'+
    'for encryption.  Please install the latest Chrome, Firefox, or Safari browser</p>');
    $('body').append(err_dialog);
    err_dialog.dialog({
      dialogClass:"no-close",
      modal: true,
      resizable: false,
      draggable: false,
      autoOpen: true,
      closeOnEscape: false,
      width: 'auto'
    });
    return;  // Don't let the code throw a bunch of errors on crypto.
  }
  // Create the password dialog
  $("#password-dialog").dialog({
    modal: true,
    resizable: false,
    autoOpen: false,
    width: 'auto',
    buttons: {
      Ok: function(){
        attemptKeyDecrypt();
      },
      Cancel: function(){
        $(this).dialog("close");
      }
    }
  });
  // Create the key generation dialog
  $("#key-generation").dialog({
    modal: true,
    resizable: false,
    autoOpen: false,
    width: 'auto',
    buttons: {
      Ok: function(){
        // TODO: Test passwords match
        var p1=$("input[name='pass1']").val();
        var p2=$("input[name='pass2']").val();
        if (p1 != p2){
          $("#key-generation-error").text('Passwords do not match');
        }else if (p1 == "") {
          $("#key-generation-error").text('Password cannot be blank');
        } else {
          $("#key-generation-error").text('');
          window.sessionStorage.setItem('privatekeypass',$("input[name='pass1']").val());
          setTimeout(generateKeypair,50);
          $('#key-generation').dialog('close');
        }
      },
      Cancel: function(){
        $('#key-generation').dialog('close');
      }
    }
  });
  // Create the key decryption dialog
  $("#key-decrypt").dialog({
    dialogClass:"no-close",
    modal: true,
    resizable: false,
    draggable: false,
    autoOpen: false,
    closeOnEscape: false,
    width: 'auto'
  });
  $('#message-sent-dialog').dialog({
    modal: true,
    resizable: false,
    draggable: false,
    autoOpen: false,
    width: 'auto',
    close: function(){
      $('#message-form').resetForm();
      // Clear friends list
      $('#selected-friends').children().remove();
    }
  });
  var expire_fmt = function(expire){
    var exp_msg ='';
    var days = Math.floor(expire/24);
    if (days > 0) exp_msg = exp_msg+' '+days+' day';
    if (days > 1) exp_msg = exp_msg+'s';
    var hours = expire % 24;
    exp_msg = exp_msg+' '+hours+' hour';
    if (hours > 1) exp_msg = exp_msg+'s';
    $("#expire-hours").text(exp_msg);
  };
  $('#expire-slider').slider({
    range: "min",
    value: 24,
    min: 1,
    max: 24*7,
    slide: function(event,ui){ 
      expire_fmt(ui.value);
    }
  });
  expire_fmt($('#expire-slider').slider('value'));
  // Create the password dialog
  $("#forget-me").dialog({
    modal: true,
    resizable: false,
    autoOpen: false,
    width: 'auto',
    buttons: {
      Ok: function(){
        $.ajax({url:'/user',async:false,type:'delete',dataType:'json',success: function(e){
          // Remove all local/remote session data
          localStorage.clear();
          sessionStorage.clear();
          window.location.href="/";
          }
        });
      },
      Cancel: function(){
        $(this).dialog("close");
      }
    }
  });

  // Convert buttons to jquery ui button objects
  $("button").button();
  // Bind add all friends to an action
  $("#add-all-friends").click(function(e){
    e.preventDefault();
    // Remove existing friends
    $('#selected-friends').children().remove();
    // All all friends with pubkeys
    if (user){
      user.friends.forEach(function(friend){
        if (friend.public_key){
          addFriend(friend);
          //$('#selected-friends').append('<div class="friend" id="'+friend.fb_id+'"><img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">'+friend.name+'<div class="remove-friend">x</div></div>');
        }
      });
    }
  });
  // Initialize the friend autocomplete
  $('#friend-autoselect').autocomplete({
    minLength:0,
    source:function( request, response){
      var matches = [];
      var idx =0;
      //console.log('request is');
      //console.log(request);
      // TODO: alphabetize the user friend list - in server
      user.friends.forEach( function (friend,idx,all_friends){
        //console.log($('#'+friend.fb_id));
        if ((friend.public_key)&&($('#'+friend.fb_id).length == 0)) {
          if (friend.name.toLowerCase().indexOf(request.term.toLowerCase()) != -1){
            matches.push({label:friend.name,value:idx});
          }
        }
      });
      response(matches);
    },
    focus: function( event, ui ){
      $( "#project" ).val( ui.item.name );
      return false;
    },
    select: function(event, ui){
      // Create a new friend box
      var friend = user.friends[ui.item.value];
      // TODO: Avoid duplicates
      addFriend(friend);
      //var new_friend = $('#selected-friends').append('<div class="friend" id="'+friend.fb_id+'"><img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">'+friend.name+'<div class="remove-friend">x</div></div>');
      //console.log(new_friend);
      return false;
    }
  });
  // Bind Invite friends to an action
  // TODO: Expand to a full selector/message
  // TODO: Server work to accomodate facebook messages
  $('#invite-friends').click( function(e) {
    e.preventDefault();
    FB.ui({method: 'apprequests',
      message: 'Please join me on Fourth Social for private conversations'
    }, function(e){
      //console.log('Done with requests');
    });
  });
  // Bind all message unlock to an action
  $('#all-message-unlock').click( function(e) {
    e.preventDefault();
    //console.log(e);
    $('.lock-toggle.locked').trigger('click');
  });
  // Bind all message lock to an action
  $('#all-message-lock').click( function(e) {
    e.preventDefault();
    //console.log(e);
    $('.lock-toggle.unlocked').trigger('click');
  });
  // Get the theme rolling
  $('#menu').buttonset();
  // Kick off the message load in the background
  setTimeout(loadMessages,20);
  openpgp.init();
  // Populate key-management content
  updateKeyManagement(true);
  // Unlock the key or display dialog required
  unlockKey();
  // Set up event handlers for task buttons
  $('#menu').change(function(e){
    //console.log('change happens');
    //console.log(e.target.id);
    selectPane(e.target.value);
  });
  // Start decryption on enter in password field
  $("#password-dialog input").keypress(function (e) {
    if (e.which == 13) {
      attemptKeyDecrypt();
    }
  });
  // Send message form binding
  $('#message-form').submit(sendMessage);
  selectPane('#messages');
  // Kick off expire loop
  updateExpireLoop();
  $('#page').fadeIn(1000);
}

function unlockKey(){
  if (pk_clear){
    //Done
    return;
  }
  // Set the pane needed to unlock the key
  if (! openpgp.keyring.hasPrivateKey()){
    // TODO - go straight to password picking for new key
    selectPane('#key-management');
  } else {
    // Start unlocking private
    var pk_pass = window.sessionStorage.getItem("privatekeypass");
    if (pk_pass != null){
      //$("#key-decrypt").dialog('open');
      decryptPrivateKey();
    } else {
      $("#password-dialog").dialog('open');
    }
  }
}

function updateKeyManagement(update_user){
  // Update the key management section based on server-stored keypairs,
  // Compare to what's in local and session storage
  
  var keys=openpgp.keyring;
  if (update_user){
    // Attempt to pull in personal keys from server
    $.ajax({url:'/user',async:false,type:'get',dataType:'json',success: function(e){
      //console.log('Loading user data');
      //console.log(e);
      user = e.data;
      // TODO: Update public keys, create top level hash of public keys to friends
      if (user.private_key){
        if (keys.hasPrivateKey()){
          var pk = keys.exportPrivateKey(0);
          if (pk.armored != user.private_key){
            // TODO: If keyring has keys and they don't match keys in keyring, warn user 
            //    and ask how they'd like to proceed.
            //console.log('Keys do not match, ask user what to do');
          }
        } else {
          // TODO: If keyring is empty and server has keys
          //    Populate keyring with server results
          //console.log('Use case not implemented');
          //console.log('Import keys from server');
          $("#password-dialog").dialog('open');
          //keys.importPrivateKey(user.private_key,pk_pass);// TODO pkpass!
        }
      } else if (keys.hasPrivateKey()){
        var pk = keys.exportPrivateKey(0);
        // Odd happening if user id is different than private key, can get into
        // this state on user data purge of database
        if (userId != pk.obj.userIds[0].text){
          //console.log('User ids of logged in user and pk do not match, purge the keyring');
          purgeKeyring();
          //console.log('First timer');
          $('#welcome-message').show();
          $('#overwrite-warning').hide();
          $('#key-generation').dialog('open');

          //updateKeyManagement(false); // Recursion hmmmm
          return;
        }
        var pubkey_dict = getPublicKeysForUserIds([userId]);
        //console.log(pubkey_dict);
        // If keyring is populated and server has no keys, send keypair
        $.ajax({url:'/user',type:'post',dataType:'json',data:{private_key:keys.exportPrivateKey(0).armored,public_key:pubkey_dict[userId].armored},
          success: function(e){
            if (e.success == true){
              //console.log('Successfuly stored key information');
              //console.log(e);
              user = e.data;
              unlockKey();
              updateKeyManagement(false);
              //loadMessages();
            }
          }
        });
      } else {
        // No keys anywhere for this user, start up the new keygenerator dialog
        //console.log('First timer');
        $('#welcome-message').show();
        $('#overwrite-warning').hide();
        $('#key-generation').dialog('open');
      }
    }}); // TODO: Failure of this call handled gracefully
  }
  // Personal private
  if (pk_clear != null) {
    //console.log(pk_clear);
    //console.log($('#unlock-btn'));
    $('#unlock-btn').button('disable');
    $('#private-key-status').removeClass().addClass('good');
    $('#private-key-status').html('Private key unlocked for user: '+pk_clear.userIds[0].text+
      ' ID: '+toHex(pk_clear.getKeyId()));
    $('#send-btn').button('enable');
  } else if (keys.hasPrivateKey()){
    var pk = keys.exportPrivateKey(0);
    //console.log(pk.obj.userIds[0].text); // How to get userid within the key
    //console.log(pk.obj.extractPublicKey()); 
    $('#private-key-status').removeClass().addClass('trouble');
    $('#private-key-status').html('Private key locked for user: '+pk.obj.userIds[0].text+
      ' ID: '+toHex(pk.obj.getKeyId()));
    $('#unlock-btn').button('enable');
    $('#send-btn').button('disable');
  } else {
    $('#private-key-status').removeClass().addClass('bad');
    $('#private-key-status').html('Private key not found - create new keypair');
    $('#unlock-btn').button('disable');
    $('#send-btn').button('disable');
  }

  // Personal public
  var pubkey_dict = getPublicKeysForUserIds([userId]);
  if (userId in pubkey_dict){
    // openpgp doesn't check if the public keys are already imported.  Must
    // clean out the keyring of public keys
    var pubkey = pubkey_dict[userId];
    openpgp.keyring.publicKeys = [pubkey];
    $('#public-key-status').removeClass().addClass('good');
    $('#public-key-status').html('Personal public key for user: '+pubkey.obj.userIds[0].text+' ID: '+toHex(pubkey.obj.getKeyId()));
  } else {
    openpgp.keyring.publicKeys = [];
    $('#public-key-status').removeClass().addClass('bad');
    $('#public-key-status').html('Personal public key not found - create new keypair');
  }
  // Friends public        
  var fk = 0;
  //console.log('import user public keys');
  //console.log(user);
  for (var fi=0; fi<user.friends.length; ++fi){
    var friend = user.friends[fi];
    if (friend.public_key) {
      openpgp.keyring.importPublicKey(friend.public_key);
      fk++;
    }
  }
  $('#friends-key-status').html(fk.toString()+' out of '+user.facebook_friend_count.toString()+' friends are on 4th social');
  if (fk == user.facebook_friend_count){
    $('#friends-key-status').removeClass().addClass('good');
  } else if (fk == 0) {
    $('#friends-key-status').removeClass().addClass('bad');
  } else {
    $('#friends-key-status').removeClass().addClass('trouble');
  }
  // TODO: Send invite to use 4th social to friends button
  //selectPane('#key-management');

}

function generateKeypair(){
  // Popup dialog warning about:
  if (openpgp.keyring.hasPrivateKey()){
    // This will replace your current key and delete all messages as they
    // will be unreadable
    //console.log('Overwriting existing key');
    $('#key-overwrite-warning').dialog('open');
  }
  var pk_pass=window.sessionStorage.getItem('privatekeypass');
  if (!pk_pass){
    //console.log('Error: no password set for private key');
    // TODO: Error dislog, maybe some kind of shared error popup
    return false;
  }
  // This process can take upwards of a minute and cause your browser to
  // think the scripts are hung.  Just be patient, you only have to do 
  // this once.
  $('#key-decrypt').dialog('open');
  window.setTimeout(function (){
    //console.log("Generating new keypair");
    //console.log('pk_pass is '+pk_pass);
    var key = openpgp.generate_key_pair(1, 1024, userId, pk_pass);
    // Replace dialog with success, sending new key
    //$('#key-management').append('<div>'+openpgp.read_publicKey(key.publicKeyArmored)+'</div>');
    openpgp.keyring.importPrivateKey(key.privateKeyArmored,pk_pass);
    openpgp.keyring.importPublicKey(key.publicKeyArmored);
    openpgp.keyring.store();
    // Private key is unusable until it is exported
    //console.log('export from keyring');
    pk_clear=openpgp.keyring.exportPrivateKey(0).obj;
    //console.log(pk_clear);
    updateKeyManagement(true); // Will send keys to server, unencrypt private key for window variable
    // Close dialog
    $('#key-decrypt').dialog('close');
  },50);
  
  
}

// Sends a message to users
// This will create multiple PUTs to /message, one for each recipient
function sendMessage(e) {
  //console.log('Send message');
  //console.log(e);
  
  var message_raw = $('textarea[name=message]').val();
  //console.log('message raw: '+message_raw);
// Leave try/catch in for a while - the openpgp library is squirrely
try{
  // TODO: Show which users we are missing - which should never happen
  var to_list = [];
  $('#selected-friends').children().each( function(){
    //console.log('send to: '+$(this).attr('id'));
    var to_fbid = $(this).attr('id');
    for (var i=0;i<user.friends.length;++i){
      var u = user.friends[i];
      //console.log(u);
      if (u.fb_id == to_fbid){
        to_list.push(u.id);
        break;
      }
    }
  });
  //console.log(to_list);
//  var recipients = getPublicKeysForUserIds([userId]); // Self test
  var recipients = getPublicKeysForUserIds(to_list);
  //console.log(recipients);
  $.each(recipients, function (uid,pubkey) {
  // TODO: Allow message signing
//    var message = openpgp.write_encrypted_message([recipients[userId].obj],message_raw); // self test
    var message = openpgp.write_encrypted_message([pubkey.obj],message_raw);
//    console.log(message);
    var msg_data = {
      recipient:uid,
      message:message,
      expires:$('#expire-slider').slider('value')/24.0 // TODO: Get client and server on the same units
    };
    $.ajax({url:'/message',type:'put',dataType:'json',data:msg_data,success: function(e){
      // TODO: Error handling, right now everything will come back success
      //console.log(e);
      $('#message-sent-dialog').dialog('open');
      setTimeout( function(){
        $('#message-sent-dialog').dialog('close');
      },1500);
      }});
  });
} catch(err){
  //console.log(err);
}
  //$('#message-form').ajaxSubmit({url:'/message',type:'put',dataType:'json',success: function(e){console.log(e);}});
  return false;
}
function selectPane(paneSelector){
  // Hide all content
  $('#content').children().hide();
  // TODO: Get rid of this horrible hack
  //if (paneSelector == "#messages"){
  //  loadMessages();
  //}else  
  if (paneSelector == "#logout"){
    window.location.href="/logout";
  }

  $(paneSelector).show();
  //console.log('Attempting to select button');
  //console.log( $('input[value="'+paneSelector+'"]'));
  //$('#menu input[value="'+paneSelector+'"]').attr('checked','checked');
  $('#menu input[value="'+paneSelector+'"]')[0].checked=true;
//  $('input[value="'+paneSelector+'"]').button('refresh');
  $('#menu').buttonset('refresh');
  //console.log('buttonset val is '+$('#menu').val());
  //$('#menu').buttonset('refresh');
  //console.log('showing '+paneSelector);
}

function loadMessages(){
  // TODO: Turn this into a listener for changes in the server message list

  // Load messages and decrypt if possible
  //console.log(msgs);
  // User object is required
  if (!user){
    return false;
  }
  //$('#message-list').children().remove();

  //selectPane('#messages');
  //$('#message-list').append('<li>Loading...</li>');
  $.ajax('/message',{success: 
    function(msgs,status,jqXHR){
      setTimeout(loadMessages,5000);  // TODO: Switch to long polling on server, will need to break out message decrypting from loading
      if (jqXHR.status != 200){
        console.log('Non 200 message');
        console.log(jqXHR);
        return;
      }
      // Messages ready to parse
      var prepend = false;
      if ($('#message-list').children('.message').length > 0){
        // prepend new messages
        // TODO: Fix this so ordering can be selected by user
        prepend=true;
      }
      $('#message-error').remove();
      var msg_ids = [];
      //var pub_key = getPublicKeysForUserIds([userId])[userId]; // TODO: Get all public keys into a dict visible to entire class
      for (var mi=0; mi<msgs.length; ++mi) {
        //console.log(msgs[mi]);
        var message = msgs[mi];
        msg_ids.push(message._id);
        if ($('#'+message._id).length){
          //console.log('Message '+message._id+' already in list');
          //console.log($('#'+message._id));
          // Check if message has been decrypted - if not let er rip
          if (($('#'+message._id+' .plaintext').length == 0) && (pk_clear != null)){
            // Remove existing elements and try again
            console.log('Try to decrypt message again');
            $('#'+message._id).remove();
          } else {
            continue;
          }
        }
        var msg_li = $("<li>");
        msg_li.addClass("message");
        msg_li.attr("id",message._id);
        var sender=null;
        for (var i =0; i<user.friends.length; ++i){
          var friend = user.friends[i];
          if (friend.id == message.sender) {
            msg_li.append('<img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">');
            msg_li.append('<div class="sender">'+friend.name+'</div>');// TODO: Possible to attack via html in facebook name?
            sender = friend;
            break;
          }
        }
        // TODO: Template these controls a little better
        var msg_controls = $("<div>");
        msg_controls.addClass("controls");
        var enc_button = $('<span>');
        msg_li.append(msg_controls);
        msg_li.append('<div class="encrypted message-block">'+message.message+'</div>');
        try{
          var message_set=openpgp.read_message(message.message);
          // TODO: Clean up the message_set - create ui for multiple messages
          for (var j in message_set) {
            var plain_text="";
            if (pk_clear != null){
              var keymat = {key:pk_clear, keymaterial:pk_clear.privateKeyPacket};// Bizarre requirement
              //console.log(message_set[j].toString());
              if (message_set[j].sessionKeys){
                plain_text = message_set[j].decrypt(keymat,message_set[j].sessionKeys[0]);
              }
              //console.log(plain_text);
              enc_button.addClass('lock-toggle locked');
              enc_button.attr('title', 'Click to unlock message');
              enc_button.click(function(e){
                //e.preventDefault();
                var lock_div = $(this);
                if (lock_div.hasClass('locked')){
                  lock_div.removeClass('locked');
                  lock_div.addClass('unlocked');
                  lock_div.attr('title', 'Click to lock message');
                  lock_div.parent().siblings('.encrypted').hide();
                  lock_div.parent().siblings('.plaintext').show();
                } else if (lock_div.hasClass('unlocked')){
                  lock_div.removeClass('unlocked');
                  lock_div.addClass('locked');
                  lock_div.attr('title', 'Click to unlock message');
                  lock_div.parent().siblings('.encrypted').show();
                  lock_div.parent().siblings('.plaintext').hide();
                }
              });
              msg_li.append(enc_button);
              var pt_div = $('<div>');
              pt_div.addClass("plaintext message-block");
              pt_div.text(plain_text); // This takes care of messages with html markup
              msg_li.append(pt_div);
            }
          }
        } catch(err) {
          // TODO: Better error handling for user
          //msg_li.append('<div class="plaintext message-block">ERROR WITH MESSAGE</div>');
        }
        //if (msg_li.find('.plaintext').length == 0){
        if (!enc_button.hasClass('lock-toggle')){
          // Add unreadable button
          enc_button.addClass('lock-toggle unreadable');
          enc_button.attr('title', 'Unable to decrypt message');
          //msg_li.append(enc_button);
        }
        msg_controls.append(enc_button);
        // Message expiration time
        var msg_exp = $('<span class="expire-time">Expires in ...</span>');
        msg_exp.data("expires",new Date(message.expires));
        msg_controls.append(msg_exp);
        // Message reply button
        var msg_reply = $('<span class="reply" title="Reply to sender"></span>');
        msg_reply.data("sender",sender);
        msg_reply.click( function() {
          //var reply_id = $(this).parents('li').attr('id'); // May need this later
          // Fill in send message screen
          var sender = $(this).data("sender");
          //console.log(sender);
          //var friend = user.friends[sender];
          // Clear friends list
          $('#selected-friends').children().remove();
          addFriend(sender);

          var orig_msg = $(this).parent().siblings('.plaintext').text();
          var new_msg = sender.name + " wrote:\n";
          var orig_arr = orig_msg.split('\n');
          $.each(orig_arr, function(idx,line){
            new_msg = new_msg + "> "+line+"\n";
          });
          var message_raw = $('textarea[name=message]').val(new_msg);
          // Add sender to list
          selectPane('#send-message');
          
        });
        msg_controls.append(msg_reply);
        var del_button = $("<span>");
        del_button.addClass('delete-icon');
        del_button.attr('title','Delete this message');
        del_button.click(function(e){
          var del_id = $(this).parents('li').attr('id');
          $(this).parents('li').slideUp();

          //console.log(del_id);
          // TODO wire in AJAX delete call
          $.ajax({url:'/message/'+del_id,type:'delete',dataType:'json',success: function(e){
            // TODO: Check for success and handle errors
            //console.log('deleted');
            $(this).parents('li').remove();
            if ($('#message-list').children().length == 0){
              $('#message-list').append('<li id="message-error">No Messages</li>');
            }

            }
          });
        });
        msg_controls.append(del_button);
        msg_li.hide();
        if (prepend){
          $('#message-list').prepend(msg_li); 
        } else {
          $('#message-list').append(msg_li);
        }
        msg_li.show('slideDown');
      }
      // Remove messages not in list
      $('#message-list').children().each( function(){
        if ( $.inArray($(this).attr('id'),msg_ids) == -1){
          $(this).slideUp( function(){
            $(this).remove();
          });;
        }
      });
      if ($('#message-list').children().length == 0){
        $('#message-list').append('<li id="message-error">No Messages</li>');
      }
    }
  });
}

function decryptPrivateKey(){
  // Open the please wait window and do decryption
  // Close the please wait window when done
  // This is done because the keys can not be stringified and decoded
  // and the decryption will lock up the browser for a bit
  if (decrypting){
    //console.log('Already busy decrypting');
    return;
  }
  decrypting = true;
  $("#key-decrypt").dialog('open');
  setTimeout(function(){
    var pk_pass = window.sessionStorage.getItem("privatekeypass");
    // If the user's private key has been loaded from the server yet
    // not unlocked
    if ((user.private_key) && (!openpgp.keyring.hasPrivateKey()) && (pk_pass)){
      var success = openpgp.keyring.importPrivateKey(user.private_key,pk_pass);
      if (success){
        openpgp.keyring.store();
        //console.log('Imported private key');
        pk_clear=openpgp.keyring.exportPrivateKey(0).obj;
        //console.log('pk clear is');
        //console.log(pk_clear);
        $('#password-status').text('');
        $('#password-dialog').dialog('close');
        openpgp.keyring.importPublicKey(user.public_key);
        updateKeyManagement(false);
        //loadMessages();
      } else {
        //console.log('Import failed');
        $('#password-status').text('Unable to unlock key with password');
      }
    }  
    if ((pk_clear)||(!openpgp.keyring.hasPrivateKey())||(!pk_pass)){
      // Already done
      //console.log('decrypt key: Nothing to do');
      // TODO: Where to go from here?
      
    } else {
      var pk = openpgp.keyring.exportPrivateKey(0).armored;
      // Working algorithm
      var pk_clear_tmp = openpgp.read_privateKey(pk)[0];
      var success = pk_clear_tmp.privateKeyPacket.decryptSecretMPIs(pk_pass);
      if (success) {
        pk_clear=pk_clear_tmp;
        //console.log('pk clear is');
        //console.log(pk_clear);
        updateKeyManagement(false);
        //loadMessages();
        $('#password-dialog').dialog('close');
      //updateKeyManagement(false);  // This should be handled by calling routine
      } else {
        $('#password-status').text('Unable to unlock key with password');
        $('#password-dialog').dialog('open');
      }
      //console.log('Finished decrypting private key');
    }
    decrypting=false;
    $("#key-decrypt").dialog('close');
  },50);
}

/**
 * searches all public keys in the keyring matching the user ids
 * @param {publicKeys} The array of public keys
 * @param {userIds[]} The array of userIds to find
 * @return {{userId:openpgp_msg_publickey}} The public keys associated with provided user ids
 */
function getPublicKeysForUserIds(userIds) {
  var publicKeys = openpgp.keyring.publicKeys;
  var results = {};
  for (var i =0; i < publicKeys.length; i++) {
    for (var j = 0; j < publicKeys[i].obj.userIds.length; j++) {
      for (var k = 0; k < userIds.length; k++) {
        if (publicKeys[i].obj.userIds[j].text == userIds[k]){
          results[userIds[k]] = publicKeys[i];
          break;
        }
      }
    }
  }
  return results;
}

function attemptKeyDecrypt(){
  // Helper function so hitting enter after password will trigger decryption
  window.sessionStorage.setItem('privatekeypass',$("#password-dialog input").val());
  decryptPrivateKey();
}

function addFriend(friend){
  // Helper function to add a friend to the send message list
  // It does no checking for duplicates/pub key exists/etc
  var new_friend=$('<div>');
  new_friend.addClass('friend');
  new_friend.attr('id',friend.fb_id);
  new_friend.append('<img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">');
  new_friend.append('<span>'+friend.name+'</span>');
  new_friend.append('<div class="remove-friend">x</div>');
  //$('#selected-friends').append('<div class="friend" id="'+friend.fb_id+'"><img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">'+friend.name+'<div class="remove-friend">x</div></div>');
  //console.log(new_friend.children(".remove-friend"));
  
  new_friend.children(".remove-friend").click( function(e){
    //console.log('Remove friend');
    $(this).parent().remove();
  });
  $('#selected-friends').append(new_friend);
}

function updateExpireLoop(){
  // Update every message expiration time
  //console.log('Update expiry');
  var now = Date.now();
  $('.expire-time').each( function() {
    var msg = '';
    var dt = $(this).data('expires')-now;
    if (dt < 0) {
      // Should have already expired
      msg = 'Message expired';
    } else {
      var secs = Math.ceil(dt/1000);
      var ss = padzero(secs % 60);
      var mins = Math.floor(secs/60);
      var mm = padzero(mins % 60);
      var hours = Math.floor(mins / 60);
      var hh = hours %24;
      var days = Math.floor(hours/24);
      msg = 'Expiring in ';
      if (days > 0){
        msg = msg + days +" day";
        if (days > 1) msg = msg + 's';
      } else {
        msg = msg + hh +":"+mm+":"+ss;
      }
    }
    $(this).text(msg);
  });
  setTimeout(updateExpireLoop,1000);
}

function padzero(num){
  var s = num+"";
  if (s.length == 1) s="0"+s;
  return s;
}

function purgeKeyring() {
  // Remove all keys from the keyring in localStorage
  pk_clear=null;
  for (var i =0; i < openpgp.keyring.privateKeys.length; i++) {
    openpgp.keyring.removePrivateKey(i);
  }
  for (var i =0; i < openpgp.keyring.publicKeys.length; i++) {
    openpgp.keyring.removePublicKey(i);
  }
}

function toHex(str){
  var hex = '';
  for(var i=0;i<str.length;i++) {
    hex += ''+str.charCodeAt(i).toString(16);
  }
  return hex;
}
