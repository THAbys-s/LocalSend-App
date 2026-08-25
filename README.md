# LocalSend

Aplicación para enviar archivos entre dispositivos conectados a una misma red local.

## Configuración de red

LocalSend funciona a través de la red local y no requiere una conexión a Internet para transferir archivos.

Para que dos dispositivos puedan detectarse y comunicarse correctamente, deben poder establecer conexiones entre sí dentro de la red.

### Misma red

Asegúrese de que ambos dispositivos estén conectados a la misma red local.

Por ejemplo:

* La computadora puede estar conectada mediante Ethernet y el teléfono mediante Wi-Fi, siempre que ambas conexiones pertenezcan a la misma red local.
* Si ambos dispositivos utilizan Wi-Fi, deben estar conectados al mismo punto de acceso.
* Evite utilizar una red Wi-Fi de invitados.

Estar conectado al mismo router no garantiza que los dispositivos puedan comunicarse. Algunos routers y puntos de acceso bloquean la comunicación entre clientes conectados a la misma red.

### Firewall

El firewall puede impedir que LocalSend descubra otros dispositivos o acepte conexiones entrantes.

En Windows, permita que LocalSend se comunique a través del Firewall de Windows. Cuando Windows solicite permisos de red al iniciar la aplicación, permita el acceso en **redes privadas**.

Si utiliza reglas de firewall configuradas manualmente, permita el tráfico utilizado por LocalSend:

| Protocolo | Puerto  | Uso                            |
| --------- | ------- | ------------------------------ |
| UDP       | `53317` | Descubrimiento de dispositivos |
| TCP       | `53318` | Transferencia de archivos      |

El firewall debe permitir tanto las conexiones entrantes como las salientes correspondientes a estos puertos.

### Aislamiento de dispositivos

Algunos routers impiden que los dispositivos conectados a la misma red se comuniquen entre sí. Esta función puede aparecer con diferentes nombres:

* AP Isolation
* Client Isolation
* Wireless Isolation
* Wi-Fi Isolation

Si esta función está habilitada, los dispositivos pueden tener acceso a Internet pero no podrán detectarse entre ellos.

Las redes Wi-Fi de invitados suelen utilizar este tipo de aislamiento de forma predeterminada.

### VPN y adaptadores de red virtuales

Una VPN u otro software que cree adaptadores de red virtuales puede interferir con el descubrimiento de dispositivos.

Si los dispositivos no aparecen en LocalSend, pruebe a desactivar temporalmente:

* VPN
* Adaptadores de red virtuales
* Túneles de red
* Otros programas que modifiquen las conexiones de red

### Perfil de red de Windows

En Windows, se recomienda utilizar el perfil **Red privada** para la red donde se utiliza LocalSend.

Las redes configuradas como públicas utilizan reglas de firewall más restrictivas y pueden impedir las conexiones necesarias para el descubrimiento y la transferencia.

Para cambiar el perfil de red:

**Configuración → Red e Internet → Propiedades de la red → Tipo de perfil de red → Privada**

## Solución de problemas

### Los dispositivos no se detectan

Si un dispositivo no aparece en la lista:

1. Compruebe que ambos dispositivos estén conectados a la misma red local.
2. Compruebe que LocalSend esté permitido en el firewall.
3. Compruebe que ninguno de los dispositivos esté conectado a una red de invitados.
4. Compruebe que el aislamiento de clientes esté deshabilitado en el router.
5. Desactive temporalmente las VPN y los adaptadores de red virtuales.
6. Reinicie LocalSend en ambos dispositivos.

El descubrimiento utiliza **UDP en el puerto `53317`**. Si el firewall o la red bloquean este tráfico, los dispositivos no podrán aparecer automáticamente.

### Los dispositivos aparecen pero no se pueden enviar archivos

Si los dispositivos son visibles pero una transferencia no puede comenzar o finalizar, compruebe que las conexiones **TCP en el puerto `53318`** estén permitidas.

El dispositivo que recibe el archivo debe aceptar conexiones entrantes en este puerto.

### Redes de invitados

Si está utilizando una red Wi-Fi de invitados, cambie ambos dispositivos a la red principal.

Las redes de invitados suelen impedir la comunicación entre dispositivos aunque todos tengan acceso a Internet.

## Puertos utilizados

LocalSend utiliza los siguientes puertos para la comunicación dentro de la red local:

| Puerto  | Protocolo | Descripción                    |
| ------- | --------- | ------------------------------ |
| `53317` | UDP       | Descubrimiento de dispositivos |
| `53318` | TCP       | Transferencia de archivos      |

Estos puertos deben estar disponibles para la comunicación entre los dispositivos que utilizan LocalSend.

# Nota Importante

Este proyecto es solo una tarea a resolver en mis estudios, no tengo la más mínima intención de lucrar con ello.
