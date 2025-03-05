const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Permitir solicitudes CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    // Convertir el cuerpo de la solicitud a JSON
    const data = JSON.parse(event.body);
    const {
      programName,
      finalPrice,
      paymentType,
      installmentsCount,
      enrollmentFee,
      monthlyFee,
      studentName,
      studentEmail,
      discountReason
    } = data;

    // Crear un cliente en Stripe
    const customer = await stripe.customers.create({
      name: studentName,
      email: studentEmail,
      metadata: {
        program: programName,
        discountReason: discountReason || 'Sin descuento'
      }
    });

    // Definir los items de la sesión de checkout
    const lineItems = [];
    
    if (paymentType === 'enrollment') {
      // Si hay matrícula, añadirla como pago único
      if (parseFloat(enrollmentFee) > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Matrícula - ${programName}`,
            },
            unit_amount: Math.round(parseFloat(enrollmentFee) * 100), // Stripe usa céntimos
          },
          quantity: 1,
        });
      }
      
      // Añadir suscripción mensual para las cuotas restantes
      if (parseFloat(monthlyFee) > 0 && parseInt(installmentsCount) > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Cuota Mensual - ${programName}`,
            },
            unit_amount: Math.round(parseFloat(monthlyFee) * 100), // Stripe usa céntimos
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        });
      }
    } else {
      // Cuotas iguales - crear solo una suscripción
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Cuota Mensual - ${programName}`,
          },
          unit_amount: Math.round(parseFloat(monthlyFee) * 100), // Stripe usa céntimos
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        },
        quantity: 1,
      });
    }

    // Crear la sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: lineItems.length > 1 || parseInt(installmentsCount) > 1 ? 'subscription' : 'payment',
      success_url: `${process.env.URL || 'https://tu-dominio.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'https://tu-dominio.com'}/cancel`,
      metadata: {
        program: programName,
        installments: installmentsCount,
        final_price: finalPrice,
        discount_reason: discountReason || 'Sin descuento'
      }
    });

    // Devolver la URL de la sesión de checkout
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    console.error('Error al crear la sesión de checkout:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};