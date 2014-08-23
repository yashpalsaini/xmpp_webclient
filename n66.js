var Gab = {
    connection: null,
    log_password:null,

	log_jid:null,
	 connection_room: null,
    room: null,
    nickname: null,

    NS_MUC: "http://jabber.org/protocol/muc",

    joined: null,
    participants: null,

	
	
	
    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace("@", "-")
            .replace(".", "-");
    },

    on_roster: function (iq) {
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;

            // transform jid into an id
            var jid_id = Gab.jid_to_id(jid);

            var contact = $("<li id='" + jid_id + "'>" +
                            "<div class='roster-contact offline'>" +
                            "<div class='roster-name'>" +
                            name +
                            "</div><div class='roster-jid'>" +
                            jid +
                            "</div></div></li>");

            Gab.insert_contact(contact);
        });

        // set up presence handler and send initial presence
        Gab.connection.addHandler(Gab.on_presence, null, "presence");
        Gab.connection.send($pres());
    },

    pending_subscriber: null,

    on_presence: function (presence) {
        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        var jid_id = Gab.jid_to_id(from);
          var room = Strophe.getBareJidFromJid(from);
    
	if (room === Gab.room) {
            var nick = Strophe.getResourceFromJid(from);
            if ($(presence).attr('type') === 'error' &&
                !Gab.joined) {
                // error joining room; reset app
                Gab.connection.disconnect();
            } else if (!Gab.participants[nick] &&
                $(presence).attr('type') !== 'unavailable') {
                // add to participant list
                var user_jid = $(presence).find('item').attr('jid');
                Gab.participants[nick] = user_jid || true;
                $('#participant-list').append('<li>' + nick + '</li>');

                if (Gab.joined) {
                    $(document).trigger('user_joined', nick);
                }
            } else if (Gab.participants[nick] &&
                       $(presence).attr('type') === 'unavailable') {
                // remove from participants list
                $('#participant-list li').each(function () {
                    if (nick === $(this).text()) {
                        $(this).remove();
                        return false;
                    }
                });

                $(document).trigger('user_left', nick);
            }

            if ($(presence).attr('type') !== 'error' && 
                !Gab.joined) {
                // check for status 110 to see if it's our own presence
                if ($(presence).find("status[code='110']").length > 0) {
                    // check if server changed our nick
                    if ($(presence).find("status[code='210']").length > 0) {
                        Gab.nickname = Strophe.getResourceFromJid(from);
                    }

                    // room join complete
                    $(document).trigger("room_joined");
                }
            }
        }

	  else{
   	   if (ptype === 'subscribe') {
            // populate pending_subscriber, the approve-jid span, and
            // open the dialog
            Gab.pending_subscriber = from;
            $('#approve-jid').text(Strophe.getBareJidFromJid(from));
            $('#approve_dialog').dialog('open');
        } else if (ptype !== 'error') {
            var contact = $('#roster-area li#' + jid_id + ' .roster-contact')
                .removeClass("online")
                .removeClass("away")
                .removeClass("offline");
            if (ptype === 'unavailable') {
                contact.addClass("offline");
            } else {
                var show = $(presence).find("show").text();
                if (show === "" || show === "chat") {
                    contact.addClass("online");
                } else {
                    contact.addClass("away");
                }
            }

            var li = contact.parent();
            li.remove();
            Gab.insert_contact(li);
        }

        // reset addressing for user since their presence changed
        var jid_id = Gab.jid_to_id(from);
        $('#chat-' + jid_id).data('jid', Strophe.getBareJidFromJid(from));

		}
		 return true;
    },

    on_roster_changed: function (iq) {
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = Gab.jid_to_id(jid);

            if (sub === 'remove') {
                // contact is being removed
                $('#' + jid_id).remove();
            } else {
                // contact is being added or modified
                var contact_html = "<li id='" + jid_id + "'>" +
                    "<div class='" + 
                    ($('#' + jid_id).attr('class') || "roster-contact offline") +
                    "'>" +
                    "<div class='roster-name'>" +
                    name +
                    "</div><div class='roster-jid'>" +
                    jid +
                    "</div></div></li>";

                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                } else {
                    Gab.insert_contact(contact_html);
                }
            }
        });

        return true;
    },

	
	
//for one-one chat and private messages	for room chat...
    on_message: function (message) {
	console.log("postion 15");
        var full_jid = $(message).attr('from');
        var jid = Strophe.getBareJidFromJid(full_jid);
        var jid_id = Gab.jid_to_id(jid);
		console.log("postion 16");
		
		console.log("postion 17");
   if (jid === Gab.room) {
            var body = $(message).children('body').text();
            Gab.add_message_room("<div class='message private'>" +
                                "@@ &lt;<span class='nick'>" +
                                nick + "</span>&gt; <span class='body'>" +
                                body + "</span> @@</div>");
            
      return true;
	
	}
	else{
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area_one').tabs('add', '#chat-' + jid_id, jid);
            $('#chat-' + jid_id).append(
                "<div class='chat-messages'></div>" +
                "<input type='text' class='chat-input'>");
        }
        
        $('#chat-' + jid_id).data('jid', full_jid);

        $('#chat-area_one').tabs('select', '#chat-' + jid_id);
        $('#chat-' + jid_id + ' input').focus();

        var composing = $(message).find('composing');
        if (composing.length > 0) {
            $('#chat-' + jid_id + ' .chat-messages').append(
                "<div class='chat-event'>" +
                Strophe.getNodeFromJid(jid) +
                " is typing...</div>");

            Gab.scroll_chat(jid_id);
        }

        var body = $(message).find("html > body");

        if (body.length === 0) {
            body = $(message).find('body');
            if (body.length > 0) {
                body = body.text()
            } else {
                body = null;
            }
        } else {
            body = body.contents();

            var span = $("<span></span>");
            body.each(function () {
                if (document.importNode) {
                    $(document.importNode(this, true)).appendTo(span);
                } else {
                    // IE workaround
                    span.append(this.xml);
                }
            });

            body = span;
        }

        if (body) {
            // remove notifications since user is now active
            $('#chat-' + jid_id + ' .chat-event').remove();

            // add the new message
            $('#chat-' + jid_id + ' .chat-messages').append(
                "<div class='chat-message'>" +
                "&lt;<span class='chat-name'>" +
                Strophe.getNodeFromJid(jid) +
                "</span>&gt;<span class='chat-text'>" +
                "</span></div>");

            $('#chat-' + jid_id + ' .chat-message:last .chat-text')
                .append(body);

            Gab.scroll_chat(jid_id);
        }

        return true;
		}
    },

    scroll_chat: function (jid_id) {
        var div = $('#chat-' + jid_id + ' .chat-messages').get(0);
        div.scrollTop = div.scrollHeight;
    },


    presence_value: function (elem) {
        if (elem.hasClass('online')) {
            return 2;
        } else if (elem.hasClass('away')) {
            return 1;
        }

        return 0;
    },

    insert_contact: function (elem) {
        var jid = elem.find('.roster-jid').text();
        var pres = Gab.presence_value(elem.find('.roster-contact'));
        
        var contacts = $('#roster-area li');

        if (contacts.length > 0) {
            var inserted = false;
            contacts.each(function () {
                var cmp_pres = Gab.presence_value(
                    $(this).find('.roster-contact'));
                var cmp_jid = $(this).find('.roster-jid').text();

                if (pres > cmp_pres) {
                    $(this).before(elem);
                    inserted = true;
                    return false;
                } else {
                    if (jid < cmp_jid) {
                        $(this).before(elem);
                        inserted = true;
                        return false;
                    }
                }
            });

            if (!inserted) {
                $('#roster-area ul').append(elem);
            }
        } else {
            $('#roster-area ul').append(elem);
        }
    },
	
	// public message for room...
    on_public_message: function (message) {
        var from = $(message).attr('from');
        var Room = Strophe.getBareJidFromJid(from);
        var nick = Strophe.getResourceFromJid(from);
        // make sure message is from the right place
        if (Room === Gab.room) {
            // is message from a user or the room itself?
            var notice = !nick;

            // messages from ourself will be styled differently
            var nick_class = "nick";
            if (nick === Gab.nickname) {
                nick_class += " self";
            }
            
            var body = $(message).children('body').text();

            var delayed = $(message).children("delay").length > 0  ||
                $(message).children("x[xmlns='jabber:x:delay']").length > 0;

            // look for room topic change
            var subject = $(message).children('subject').text();
            if (subject) {
                $('#room-topic').text(subject);
            }

            if (!notice) {
                var delay_css = delayed ? " delayed" : "";

                var action = body.match(/\/me (.*)$/);
                if (!action) {
                    Gab.add_message_room(
                        "<div class='message" + delay_css + "'>" +
                            "&lt;<span class='" + nick_class + "'>" +
                            nick + "</span>&gt; <span class='body'>" +
                            body + "</span></div>");
                } else {
                    Gab.add_message_room(
                        "<div class='message action " + delay_css + "'>" +
                            "* " + nick + " " + action[1] + "</div>");
                }
            } else {
                Gab.add_message_room("<div class='notice'>*** " + body +
                                    "</div>");
            }
        }

        return true;
    },

//add message to room chat...
    add_message_room: function (msg) {
        // detect if we are scrolled all the way down
        var chat = $('#chat').get(0);
        var at_bottom = chat.scrollTop >= chat.scrollHeight - 
            chat.clientHeight;
        
        $('#chat').append(msg);

        // if we were at the bottom, keep us at the bottom
        if (at_bottom) {
            chat.scrollTop = chat.scrollHeight;
        }
    },

};


//login dialog box... 
$(document).ready(function () {

 $('#login_dialog_main').dialog({
        autoOpen: true,
        draggable: false,
        modal: true,
        title: 'Welcome to N66 chat',
        buttons: {
            "submit": function () {
                $(document).trigger('submit', {
                    jid: $('#jid').val(),
                    password: $('#password').val(),
					username : $('#username').val(),
                });
                               
                $('#password').val('');
                $(this).dialog('close');
				console.log("postion 1");
            },
			"create-account": function() {
		     $('#password').val('');
			 $(this).dialog('close');
			 $('#create_account').dialog('open');
			 }

        }
    });
 
 
 //conference attributes...
  $('#room_password').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Welcome to n66 Conference',
        buttons: {
            "submit": function () {
                $(document).trigger('room_chat', {
                    con_group_name: $('#con_name').val(),
                    con_password: $('#room_password').val(),
					
                });
                               
                $('#room_password').val('');
                $(this).dialog('close');
				cconsole.log("postion 14");
            },
			
        }
    });
 
 
		
		
    
	
	
//main page dialog...	
	$('#main_page_dialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Welcome to N66 chat',
		
    });
	
//dialog for one one chat...	
	$('#single').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Welcome to N66 chat',
    });
	
	
//dialog for multi chat...	
	$('#multi_chat').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Welcome to Nylon66 ',
    });
	
 
 //account create dialog...
  $('#create_account').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'create new account',
    });
 
 
 
 
 
//contact-dialog ...
    $('#contact_dialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Add a Contact',
        buttons: {
            "Add": function () {
                $(document).trigger('contact_added', {
                    jid: $('#contact-jid').val(),
                    name: $('#contact-name').val()
                });

                $('#contact-jid').val('');
                $('#contact-name').val('');
                
                $(this).dialog('close');
            }
        }
    });

    $('#new-contact').click(function (ev) {
        $('#contact_dialog').dialog('open');
    });
	
		
// approve-dialog...
    $('#approve_dialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Subscription Request',
        buttons: {
            "Deny": function () {
                Gab.connection.send($pres({
                    to: Gab.pending_subscriber,
                    "type": "unsubscribed"}));
                Gab.pending_subscriber = null;

                $(this).dialog('close');
            },

            "Approve": function () {
                Gab.connection.send($pres({
                    to: Gab.pending_subscriber,
                    "type": "subscribed"}));

                Gab.connection.send($pres({
                    to: Gab.pending_subscriber,
                    "type": "subscribe"}));
                
                Gab.pending_subscriber = null;

                $(this).dialog('close');
            }
        }
    });

    $('#chat-area_one').tabs().find('.ui-tabs-nav').sortable({axis: 'x'});

    $('.roster-contact').live('click', function () {
        var jid = $(this).find(".roster-jid").text();
        var name = $(this).find(".roster-name").text();
        var jid_id = Gab.jid_to_id(jid);

        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area_one').tabs('add', '#chat-' + jid_id, name);
            $('#chat-' + jid_id).append(
                "<div class='chat-messages'></div>" +
                "<input type='text' class='chat-input'>");
            $('#chat-' + jid_id).data('jid', jid);
        }
        $('#chat-area_one').tabs('select', '#chat-' + jid_id);

        $('#chat-' + jid_id + ' input').focus();
    });

    $('.chat-input').live('keypress', function (ev) {
        var jid = $(this).parent().data('jid');

        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var message = $msg({to: jid,
                                "type": "chat"})
                .c('body').t(body).up()
                .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});
            Gab.connection.send(message);

            $(this).parent().find('.chat-messages').append(
                "<div class='chat-message'>&lt;" +
                "<span class='chat-name me'>" + 
                Strophe.getNodeFromJid(Gab.connection.jid) +
                "</span>&gt;<span class='chat-text'>" +
                body +
                "</span></div>");
            Gab.scroll_chat(Gab.jid_to_id(jid));

            $(this).val('');
            $(this).parent().data('composing', false);
        } else {
            var composing = $(this).parent().data('composing');
            if (!composing) {
                var notify = $msg({to: jid, "type": "chat"})
                    .c('composing', {xmlns: "http://jabber.org/protocol/chatstates"});
                Gab.connection.send(notify);

                $(this).parent().data('composing', true);
            }
        }
    });

	// button actions for one_one chat...
   $('#one_one').click(function (ev) {
    $('#main_page_dialog').dialog('close');
	  $(document).trigger('one_one_chat_1');
	   });
		
	// button action for groupe chat...	
   $('#room').click(function (ev) {
        $('#main_page_dialog').dialog('close');
	    $(document).trigger('room_chat');
		});
	
   $('#disconnect').click(function (ev) {
      $(document).trigger('disconnected');	     
		});	
		
	
	
    $('#disconnect_one_one').click(function () {
Gab.pending_subscriber = null;
    $('#roster-area ul').empty();
    $('#chat-area_one ul').empty();
    $('#chat-area_one div').remove();
	$('#one_one_chat').dialog('close');
	$('#main_page_dialog').dialog('open');
    });

    $('#chat_dialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Start a Chat',
        buttons: {
            "Start": function () {
                var jid = $('#chat-jid').val();
                var jid_id = Gab.jid_to_id(jid);

                $('#chat-area_one').tabs('add', '#chat-' + jid_id, jid);
                $('#chat-' + jid_id).append(
                    "<div class='chat-messages'></div>" +
                    "<input type='text' class='chat-input'>");
            
                $('#chat-' + jid_id).data('jid', jid);
            
                $('#chat-area_one').tabs('select', '#chat-' + jid_id);
                $('#chat-' + jid_id + ' input').focus();
            
            
                $('#chat-jid').val('');
                
                $(this).dialog('close');
            }
        }
    });

    $('#new-chat').click(function () {
        $('#chat_dialog').dialog('open');
    });

//room_chat...................................
	$('#leave').click(function () {
        $('#leave').attr('disabled', 'disabled');
        Gab.connection.send(
            $pres({to: Gab.room + "/" + Gab.nickname,
                   type: "unavailable"}));
        Gab.connection.disconnect();
    });

    $('#input').keypress(function (ev) {
        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var match = body.match(/^\/(.*?)(?: (.*))?$/);
            var args = null;
            if (match) {
                if (match[1] === "msg") {
                    args = match[2].match(/^(.*?) (.*)$/);
                    if (Gab.participants[args[1]]) {
                        Gab.connection.send(
                            $msg({
                                to: Gab.room + "/" + args[1],
                                type: "chat"}).c('body').t(body));
                        Gab.add_message_room(
                            "<div class='message private'>" +
                                "@@ &lt;<span class='nick self'>" +
                                Gab.nickname + 
                                "</span>&gt; <span class='body'>" +
                                args[2] + "</span> @@</div>");
                    } else {
                        Gab.add_message_room(
                            "<div class='notice error'>" +
                                "Error: User not in room." +
                                "</div>");
                    }
                } else if (match[1] === "me" || match[1] === "action") {
                    Gab.connection.send(
                        $msg({
                            to: Gab.room,
                            type: "groupchat"}).c('body')
                            .t('/me ' + match[2]));
                } else if (match[1] === "topic") {
                    Gab.connection.send(
                        $msg({to: Gab.room,
                              type: "groupchat"}).c('subject')
                            .text(match[2]));
                } else if (match[1] === "kick") {
                    Gab.connection.sendIQ(
                        $iq({to: Gab.room,
                             type: "set"})
                            .c('query', {xmlns: Gab.NS_MUC + "#admin"})
                            .c('item', {nick: match[2],
                                        role: "none"}));
                } else if (match[1] === "ban") {
                    Gab.connection.sendIQ(
                        $iq({to: Gab.room,
                             type: "set"})
                            .c('query', {xmlns: Gab.NS_MUC + "#admin"})
                            .c('item', {jid: Gab.participants[match[2]],
                                        affiliation: "outcast"}));
                } else if (match[1] === "op") {
                    Gab.connection.sendIQ(
                        $iq({to: Gab.room,
                             type: "set"})
                            .c('query', {xmlns: Gab.NS_MUC + "#admin"})
                            .c('item', {jid: Gab.participants[match[2]],
                                        affiliation: "admin"}));
                } else if (match[1] === "deop") {
                    Gab.connection.sendIQ(
                        $iq({to: Gab.room,
                             type: "set"})
                            .c('query', {xmlns: Gab.NS_MUC + "#admin"})
                            .c('item', {jid: Gab.participants[match[2]],
                                        affiliation: "none"}));
                } else {
                    Gab.add_message_room(
                        "<div class='notice error'>" +
                            "Error: Command not recognized." +
                            "</div>");
                }
            } else {
                Gab.connection.send(
                    $msg({
                        to: Gab.room,
                        type: "groupchat"}).c('body').t(body));
            }

            $(this).val('');
        }
    });
	
	
	});


//establishing connection...
$(document).bind('submit', function (ev, data) {
    var conn = new Strophe.Connection(
        'http://localhost:7070/http-bind/');

		console.log("postion 2");
    conn.connect(data.jid, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
		
		console.log("postion 3");
            $(document).trigger('main_page');
        } else if (status === Strophe.Status.DISCONNECTED) {
		console.log("postion 4");
            $(document).trigger('disconnected');
        }
    });
    Gab.connection = conn;
});


//not connected try agian...
$(document).bind('disconnected', function () {
    
	console.log("connection failed....");
	Gab.connection = null;
    $('#login_dialog_main').dialog('open');
});

//main page...
$(document).bind('main_page',function(){
console.log('postion 5');
$('#main_page_dialog').dialog('open');
});


//one_one chat session started...
$(document).bind('one_one_chat_1', function (){
 
 $('#single').dialog('open');
console.log("postion 8");
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    Gab.connection.sendIQ(iq, Gab.on_roster);
	console.log("poston 9");

    Gab.connection.addHandler(Gab.on_roster_changed,
                              "jabber:iq:roster", "iq", "set");
    console.log("postion 10"); 
    Gab.connection.addHandler(Gab.on_message,
                              null, "message", "chat");

							  console.log("postion 11");
     				  

});

//room- chat session started...
$(document).bind('room_chat', function (ev,data) {
    
	Gab.joined = false;
	console.log("postion 7");
    Gab.participants = {};

    Gab.connection.send($pres().c('priority').t('1'));
    
    Gab.connection.addHandler(Gab.on_presence,
                                  null, "presence");
    Gab.connection.addHandler(Gab.on_public_message,
                                  null, "message", "groupchat");
    Gab.connection.addHandler(Gab.on_message,
                                  null, "message", "chat");
                                  
								 
    Gab.connection.send(
        $pres({
            to: Gab.room + "/" + Gab.nickname
        }).c('x', {xmlns: Gab.NS_MUC}).c('password').t(roompassword));
		$('#multi_chat').dialog('open');
});


$(document).bind('contact_added', function (ev, data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);
    Gab.connection.sendIQ(iq);
    
    var subscribe = $pres({to: data.jid, "type": "subscribe"});
    Gab.connection.send(subscribe);
});

//for room chat....
$(document).bind('disconnected_room', function () {
    $('#room-name').empty();
    $('#room-topic').empty();
    $('#participant-list').empty();
    $('#chat').empty();
	$('#multi_chat').dialog('close');
    $('main_page_dialog').dialog('open');
});

$(document).bind('room_joined', function () {
    Gab.joined = true;

    $('#leave').removeAttr('disabled');
    $('#room-name').text(Gab.room);

    Gab.add_message_room("<div class='notice'>*** Room joined.</div>")
});

$(document).bind('user_joined', function (ev, nick) {
    Gab.add_message_room("<div class='notice'>*** " + nick +
                         " joined.</div>");
});

$(document).bind('user_left', function (ev, nick) {
    Gab.add_message_room("<div class='notice'>*** " + nick +
                        " left.</div>");
});



