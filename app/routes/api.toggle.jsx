import { json } from "@remix-run/react"

export const loader = async () => {}

export const action = async ({ request }) => {
    const jsonData = await request.json();
    const oneTickId = jsonData.id;

    const oneTick = await prisma.oneTick.findFirst({
      where: {
        id: oneTickId
      }
    })
  
    if (!oneTick) {
      throw new Error("One tick not found")
    }
  
    const newStatus = !oneTick.status;
  
    await prisma.oneTick.update({
      where: {
        id: oneTick.id
      },
      data: {
        status: newStatus
      }
    })
  
    return json({
      status: newStatus,
      success: true
    });
}