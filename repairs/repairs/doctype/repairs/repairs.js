// Copyright (c) 2020, libracore AG and contributors
// For license information, please see license.txt

var Switch1 = false;
var Switch2 = false;

frappe.ui.form.on('Repairs', {

    refresh: function(frm) {
        get_customer_address();
        get_dates();

        if (frm.doc.quotation == 1) {
            cur_frm.toggle_display("offer_accepted", true);
        } else {
            cur_frm.toggle_display("offer_accepted", false);
        }

        frm.add_custom_button(__("E-Mail schreiben"), function() {
            write_email();
        });

        if (Switch1 == true && Switch2 == false) {
            frm.add_custom_button(__("Reparatur abschliessen"), function() {
                if (!frm.doc.entry_date || !frm.doc.location || !frm.doc.price || !frm.doc.work_tbd) {
                    frappe.confirm(
                        'Warnung! Es wurden leere Felder entdeckt, deren Inhalte für das Abschliessen der Reparatur notwendig sind. Reparatur dennoch abschliessen?',
                        function() {},
                        function() {
                            return;
                        }
                    )
                }
                frm.set_value('repair_status', "Ready for pickup");
                frappe.confirm(
                    'Reparatur abgeschlossen! Möchten Sie den Kunden informieren? Alle bisherigen Eingaben werden gespeichert.',
                    function() {
                        frm.doc.customer_informed = Number(1);
                        frm.save();
                        write_email();
                    },
                    function() {
                        return;
                    }
                );
                Switch1 = false;
                Switch2 = true;
            });
        }

        if (Switch2 == true) {
            frm.add_custom_button(__("Reparaturartikel erstellen"), function() {
                frappe.db.insert({
                    doctype: 'Item',
                    name: frm.doc.name,
                    item_code: frm.doc.name,
                    creation: get_date_today(),
                    item_group: 'Reparaturen',
                    description: frm.doc.work_done
                });
                show_alert("Reparaturartikel wurde erstellt!", 5);
                Switch2 == false;
            });
        }

        function get_dates() {
            var dates = "<b>History</b><br>";
            if (frm.doc.entry_date) {
                dates += ("Eingang der Reparatur: " + frm.doc.entry_date);
            }
            if (frm.doc.offer_accepted) {
                dates += ("\<br>Annahme der Offerte: " + frm.doc.offer_accepted);
            }
            if (frm.doc.appointment) {
                dates += ("<br>Zu reparieren bis: " + frm.doc.appointment);
            }
            if (frm.doc.supplier_appointment) {
                dates += ("<br>Reparaturtermin Extern: " + frm.doc.supplier_appointment);
            }
            if (frm.doc.retrieved) {
                dates += ("<br>Abgeholt am: " + frm.doc.retrieved);
            }

            cur_frm.set_df_property('history', 'options', dates);
        }

        function get_email_body() {
            var message = "Sehr geehrter Kunde" + " " + frm.doc.customer + " " + "Wir schreiben Ihnen um sie darüber zu informieren, dass ihr Gegenstand abholbereit ist.";
            return message;
        }

        function write_email() {
            new frappe.views.CommunicationComposer({
                doc: {
                    doctype: frm.doc.doctype,
                    name: frm.doc.name
                },
                subject: "Information " + frm.doc.name,
                recipients: frm.doc.email,
                cc: "",
                attach_document_print: true,
                message: get_email_body()
            });
        }
    },

    quotation: function(frm) {
        if (frm.doc.quotation == 1) {
            cur_frm.toggle_display("offer_accepted", true);
        } else {
            cur_frm.toggle_display("offer_accepted", false);
        }
    },

    offer_accepted: function(frm) {
        if (frm.doc.offer_accepted) {
            frm.set_value('repair_status', "To be repaired");
        }
    },

    guarantee: function(frm) {
        if (frm.doc.guarantee) {
            frm.set_value('price', 0);
        }
    },

    recieve_item: function(frm) {
        frappe.confirm(
            'Die Entgegennahme des Gegenstandes wird abgeschlossen und die Eingaben gespeichert. Ist das in Ordnung?',
            function() {
                var today = get_date_today();
                frm.set_value('entry_date', today);
                frm.save();
                group_trigger_2();
                Switch1 = true;
            },
            function() {
                return;
            }
        );
    },

    customer: function(frm) {
        get_customer_address();
    }

});

function get_customer_address() {
    var customer = frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Customer',
            filters: {
                'name': cur_frm.doc.customer,
            },
            fieldname: ['customer_name', 'address_line1', 'city', 'pincode', 'country']
        },
        callback: function(r) {
            var customer = r.message;
            var customer_info = (customer.customer_name + "<br>" + customer.address_line1 + "<br>" + customer.pincode + " " + customer.city + "<br>" + customer.country);
            cur_frm.set_df_property('customer_address', 'options', customer_info);
        }
    });
}

function get_date_today() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = yyyy + '.' + mm + '.' + dd;
    return today;
}

function hide_buttons() {

}

function group_trigger_2() {
    cur_frm.toggle_display("section_break_19", true);
    cur_frm.toggle_display("material", true);
    cur_frm.toggle_display("item_group", true);
    cur_frm.toggle_display("caliber", true);
    cur_frm.toggle_display("work_done", true);
    cur_frm.toggle_display("section_break_27", true);
    cur_frm.toggle_display("item_subgroup", true);
    cur_frm.toggle_display("reference", true);
    cur_frm.toggle_display("supplier_appointment", true);
    cur_frm.toggle_display("customer_informed", true);
    cur_frm.toggle_display("retrieved", true);
    cur_frm.toggle_display("recieve_item", false);
}
