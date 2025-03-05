const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Verifica la firma de Stripe para el webhook
  const sig = event.headers['stripe-signature'];
  
  try {
    // Verifica la firma del webhook
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Manejar diferentes eventos de Stripe
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        const session = stripeEvent.data.object;
        // Procesar la matrícula completada
        console.log(`Matriculación completada para: ${session.customer}`);
        break;
        
      case 'invoice.paid':
        const invoice = stripeEvent.data.object;
        // Procesar el pago de una cuota
        console.log(`Cuota pagada para: ${invoice.customer}`);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = stripeEvent.data.object;
        // Manejar fallos en el pago
        console.log(`Fallo en el pago para: ${failedInvoice.customer}`);
        break;
        
      case 'customer.subscription.deleted':
        const subscription = stripeEvent.data.object;
        // Gestionar el fin de una suscripción
        console.log(`Suscripción finalizada para: ${subscription.customer}`);
        break;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error(`Error de webhook: ${error.message}`);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${error.message}` })
    };
  }
};