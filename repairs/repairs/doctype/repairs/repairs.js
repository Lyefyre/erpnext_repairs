// Copyright (c) 2020, libracore AG and contributors
// For license information, please see license.txt


frappe.ui.form.on('Repairs', {

    refresh: function(frm) {
        // Get the customers personal info
        get_customer_address();
        // Get various form dates and display them
        get_dates();

        // Hide second half of the form
        if (frm.doc.repstatus !== "Start") {
            group_trigger_2();
        }

        // Filter Warehouses to only display repair warehouses
        cur_frm.fields_dict['location'].get_query = function(doc) {
            return {
                filters: {
                    "is_repair_warehouse": 1
                }
            }
        }

        // Filter Item Groups to only display parent groups
        cur_frm.fields_dict['item_group'].get_query = function(doc) {
            return {
                filters: {
                    "is_parent_group": 1
                }
            }
        }

        // Filter Suppliers to only display repair suppliers
        cur_frm.fields_dict['supplier'].get_query = function(doc) {
            return {
                filters: {
                    "is_repair_supplier": 1
                }
            }
        }

        // Whenever "Quotation wanted" is checked, show "offer accepted" field. Hide when unchecked. Refresh trigger
        if (frm.doc.quotation == 1) {
            cur_frm.toggle_display("offer_accepted", true);
        } else {
            cur_frm.toggle_display("offer_accepted", false);
        }

        // Adds a shortage button to get to the email function faster
        frm.add_custom_button(__("E-Mail schreiben"), function() {
            write_email();
        });

        // If the hidden repair state is "Finish"... 
        if (cur_frm.doc.repstatus == "Finish") {
            // ... display button to send the repair item to an external company.
            frm.add_custom_button(__("Reparatur verschicken"), function() {
                frappe.confirm(
                    'Diese Funktion ist für eine externe Reparatur gedacht. Alle Eingaben werden gespeichert und Sie werden zum Begleitschein weitergeleitet.',
                    function() {
                        // Automatically set the field location to the specified supplier
                        frm.set_value('location', frm.doc.supplier + " - MU");
                        frm.save();
                        // Replace "192.168.1.195" with the host address and "en-US" with the system language!
                        var link = "http://192.168.1.195/api/method/frappe.utils.print_format.download_pdf?doctype=Repairs&name=" + frm.doc.name + "&format=Begleitschein&no_letterhead=0&_lang=en-US";
                        window.location.href = link;
                    }
                )
            });
            // ... display button to end the reparation process.
            frm.add_custom_button(__("Reparatur abschliessen"), function() {
                // Check if some important fields have been filled.
                if (!frm.doc.entry_date || !frm.doc.location || !frm.doc.price || !frm.doc.work_done) {
                    frappe.confirm(
                        // Display a warning, but leave the user the choice to end the repair or not.
                        'Warnung! Es wurden leere Felder entdeckt, deren Inhalte für das Abschliessen der Reparatur notwendig sind. Reparatur dennoch abschliessen?',
                        function() {
                            end_reparation();
                        },
                        function() {
                            return;
                        }
                    )
                } else {
                    end_reparation();
                }
            });
        }

        // If the hidden repair status is "Createitem", display the button to create an entry in "Item".
        if (cur_frm.doc.repstatus == "Createitem") {
            frm.add_custom_button(__("Reparaturartikel erstellen"), function() {
                // This will create the item with the properties of the repair.
                frappe.db.insert({
                    doctype: 'Item',
                    name: frm.doc.name,
                    item_code: frm.doc.name,
                    creation: get_date_today(),
                    item_group: 'Reparaturen',
                    description: frm.doc.work_done,
                    // Set the valuation rate to 0.01 to have a minimum amount that can be used in transactions.
                    valuation_rate: 0.01,
                    sales_price: frm.doc.price

                });
                frappe.show_alert("Reparaturartikel wurde erstellt! Alle Eingaben werden gespeichert", 5);
                // Set the hidden repair state to "Stockentry" to move on to the next phase
                frm.set_value('repstatus', 'Stockentry');
                frm.save();
            });
        }

        // If the hidden repair state is "Stockentry", display the button to generate a stock entry with the previously created item.
        if (cur_frm.doc.repstatus == "Stockentry") {
            frm.add_custom_button(__("Reparaturartikel verbuchen"), function() {
                frappe.call({
                    method: "repairs.repairs.doctype.repairs.repairs.create_stock",
                    args: {
                        "item": cur_frm.doc.name
                    },
                    callback: function(r) {
                        if (r.message) {
                            // The stock entry has yet to be submitted, but the item can already be sold at POS.
                            frappe.show_alert("Reparaturartikel wurde verbucht, aber muss noch gespeichert werden! Alle Eingaben werden gespeichert", 5);
                        }
                    }
                });
                // Set the hidden repair state to "Stockentry" to move on to the next phase.
                frm.set_value('repstatus', 'End');
                frm.save();
            });
        }

        // Get various dates and display them inside the history.
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
    },

    // Whenever "Quotation wanted" is checked, show "offer accepted" field. Hide when unchecked. Quotation trigger. 
    quotation: function(frm) {
        if (frm.doc.quotation == 1) {
            cur_frm.toggle_display("offer_accepted", true);
        } else {
            cur_frm.toggle_display("offer_accepted", false);
        }
    },

    // If "Offer accepted" is checked, automatically set the public repair status to "To be repaired"
    offer_accepted: function(frm) {
        if (frm.doc.offer_accepted) {
            frm.set_value('repair_status', "To be repaired");
        }
    },

    // If "guarantee" is checked, automatically set the price to 0"
    guarantee: function(frm) {
        if (frm.doc.guarantee) {
            frm.set_value('price', 0);
        }
    },

    // Pressing the "recieve Item" button will...
    recieve_item: function(frm) {
        frappe.confirm(
            // ...ask you, whether it's okay to save and move on to the next phase
            'Die Entgegennahme des Gegenstandes wird abgeschlossen und die Eingaben gespeichert. Ist das in Ordnung?',
            function() {
                // ...get today's date
                var today = get_date_today();
                // ...automatically set "entry date" to today's date.
                frm.set_value('entry_date', today);
                // ...unhide the second half of the form
                group_trigger_2();
                // ...set the value of the hidden repair status to "finish" in order to move on to the next phase.
                frm.set_value('repstatus', 'Finish');
                // ...automatically set the location, based on the customers choice of wanting an offer or not.
                if (frm.doc.quotation == 1) {
                    frm.set_value('location', 'Offerte erstellen - MU');
                } else {
                    frm.set_value('location', 'Reparatureingang - MU');
                }
                frm.save();
                // ...open the repair sheet for the customer. Replace 192.168.1.195 with host name and en_US with the system language!
                var link = "http://192.168.1.195/api/method/frappe.utils.print_format.download_pdf?doctype=Repairs&name=" + frm.doc.name + "&format=Reparaturschein&no_letterhead=0&_lang=en-US";
                window.location.href = link;
            },
            function() {
                return;
            }
        );
    },

    // Update customer's personal info, every time a customer is selected.
    customer: function(frm) {
        get_customer_address();
    },

    // When a date is filled in "retrieved", automatically set location to wait for customer and set the public repair status to "retrieved"
    retrieved: function(frm) {
        frm.set_value('location', 'Warten auf Kunde - MU');
        frm.set_value('repair_status', "Retrieved");
    }

});

// Get various personal info about the customer. Not just address, but also phone number and e-mail.
function get_customer_address() {
    var customer = frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Customer',
            filters: {
                'name': cur_frm.doc.customer,
            },
            fieldname: ['customer_name', 'address_line1', 'city', 'pincode', 'country', 'phone', 'mobile', 'email']
        },
        callback: function(r) {
            var customer = r.message;
            var customer_info = (customer.customer_name + "<br>" + customer.address_line1 + "<br>" + customer.pincode + " " + customer.city + "<br>" + customer.country + "<br> Tel: " + customer.phone + "<br> Mobil: " + customer.mobile + "<br>" + customer.email);
            cur_frm.set_df_property('customer_address', 'options', customer_info);
            cur_frm.set_value('customer_email', customer.email);
        }
    });
}

// Prepare E-mail with the appropriate e-mail address and use a placeholder text
function get_email_body() {
    var message = "Sehr geehrter Kunde" + " " + cur_frm.doc.customer + " " + "Wir schreiben Ihnen um sie darüber zu informieren, dass ihr Gegenstand abholbereit ist.";
    return message;
}

function write_email() {
    new frappe.views.CommunicationComposer({
        doc: {
            doctype: cur_frm.doc.doctype,
            name: cur_frm.doc.name
        },
        subject: "Information " + cur_frm.doc.name,
        recipients: cur_frm.doc.customer_email,
        cc: "",
        attach_document_print: true,
        message: get_email_body()
    });
}

// Get today's date and return it
function get_date_today() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    // This formatting is necessary to get the order correct. Although the value is saved as Year, month, day, it will actually appear as Day, Month, Year.
    today = yyyy + '.' + mm + '.' + dd;
    return today;
}

// Various code that contributes to finishing the repair.
function end_reparation() {
    // Set the public Repair Status to "Ready for pickup".
    cur_frm.set_value('repair_status', "Ready for pickup");
    frappe.confirm(
        'Reparatur abgeschlossen! Möchten Sie den Kunden informieren? Alle bisherigen Eingaben werden gespeichert.',
        function() {
            cur_frm.doc.customer_informed = Number(1);
            write_email();
        },
        function() {
            return;
        }
    );
    // Set the hidden repair status to "createitem" to move on to the next phase.
    cur_frm.set_value('repstatus', 'Createitem');
    cur_frm.save();
}

// Show various fields that were previously hidden and hide the "recieve item" button so it can not be pressed again
function group_trigger_2() {
    cur_frm.toggle_display("section_break_19", true);
    cur_frm.toggle_display("supplier", true);
    cur_frm.toggle_display("work_tbd", true);
    cur_frm.toggle_display("customer_informed", true);
    cur_frm.toggle_display("section_break_27", true);
    cur_frm.toggle_display("supplier_appointment", true);
    cur_frm.toggle_display("work_done", true);
    cur_frm.toggle_display("retrieved", true);
    cur_frm.toggle_display("recieve_item", false);
}
