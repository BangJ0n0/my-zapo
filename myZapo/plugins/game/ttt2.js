export default {
  command: 'ttt2',
  alias: ['tictactoe2'],
  category: 'custom',
  description: 'Pesan hasil ekstraksi CRM otomatis',
  
  async execute(m, { sock }) {
    try {
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})

      // --- KODE RELAY ---
      await sock.message.send(
        m.chat,
        {
          messageContextInfo: {
            threadId: [],
            deviceListMetadata: {
              senderKeyIndexes: [],
              recipientKeyIndexes: []
            },
            deviceListMetadataVersion: 2,
            botMetadata: {
              messageDisclaimerText: "",
              botResponseId: "d6cd59f3-445a-442f-a976-d94a463f8078",
              verificationMetadata: {
                proofs: [
                  {
                    certificateChain: [
                      Buffer.from('TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg', 'base64'),
                      Buffer.from('TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ==', 'base64')
                    ],
                    version: 1,
                    useCase: 1,
                    signature: Buffer.from('TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==', 'base64')
                  }
                ]
              }
            }
          },
          botForwardedMessage: {
            message: {
              richResponseMessage: {
                submessages: [
                  {
                    messageType: 2,
                    messageText: "🎮 Tic-Tac-Toe vs AI"
                  }
                ],
                messageType: 1,
                unifiedResponse: {
                  data: Buffer.from('eyJyZXNwb25zZV9pZCI6ImRkNTdkMmQzLTZhNGItNDM0OC05OGVjLTMzMWQ4YmIxNDYwZSIsInNlY3Rpb25zIjpbeyJ2aWV3X21vZGVsIjp7InByaW1pdGl2ZSI6eyJfX3R5cGVuYW1lIjoiR2VuQUlhZWFjZHNud0h0bWxQcmltaXRpdmUiLCJwYXlsb2FkIjoiPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiaWRcIj5cbjxoZWFkPlxuICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAsIG1heGltdW0tc2NhbGU9MS4wLCB1c2VyLXNjYWxhYmxlPW5vXCI+XG4gIDxzdHlsZT5cbiAgICAqIHtcbiAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgICAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIH1cblxuICAgIGJvZHkge1xuICAgICAgbWFyZ2luOiAwO1xuICAgICAgcGFkZGluZzogMTBweCAwO1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIH1cblxuICAgIC5zdGF0dXMge1xuICAgICAgZm9udC1zaXplOiAwLjlyZW07XG4gICAgICBjb2xvcjogIzMzMztcbiAgICAgIG1hcmdpbi1ib3R0b206IDZweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIH1cblxuICAgIC5ib2FyZCB7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMywgNTBweCk7XG4gICAgICBncmlkLXRlbXBsYXRlLXJvd3M6IHJlcGVhdCgzLCA1MHB4KTtcbiAgICAgIGdhcDogNHB4O1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2RlZTJlNjtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgIHBhZGRpbmc6IDRweDtcbiAgICB9XG5cbiAgICAuY2VsbCB7XG4gICAgICB3aWR0aDogNTBweDtcbiAgICAgIGhlaWdodDogNTBweDtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XG4gICAgICBib3JkZXItcmFkaXVzOiA2cHg7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgICAgZm9udC1zaXplOiAxLjVyZW07XG4gICAgICBmb250LXdlaWdodDogYm9sZDtcbiAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgIHVzZXItc2VsZWN0OiBub25lO1xuICAgIH1cblxuICAgIC5jZWxsOmFjdGl2ZSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTllY2VmO1xuICAgIH1cblxuICAgIC5jZWxsLnggeyBjb2xvcjogI2ZmNmI2YjsgfVxuICAgIC5jZWxsLm8geyBjb2xvcjogIzMzOWFmMDsgfVxuXG4gICAgYnV0dG9uIHtcbiAgICAgIG1hcmdpbi10b3A6IDhweDtcbiAgICAgIHdpZHRoOiAxNThweDtcbiAgICAgIHBhZGRpbmc6IDZweCAwO1xuICAgICAgZm9udC1zaXplOiAwLjhyZW07XG4gICAgICBmb250LXdlaWdodDogNjAwO1xuICAgICAgY29sb3I6ICNmZmZmZmY7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjBjOTk3O1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIH1cblxuICAgIGJ1dHRvbjphY3RpdmUge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzEyYjg4NjtcbiAgICB9XG4gIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cblxuICA8ZGl2IGNsYXNzPVwic3RhdHVzXCIgaWQ9XCJzdGF0dXNcIj5HaWxpcmFuIEFuZGEgKFgpPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImJvYXJkXCIgaWQ9XCJib2FyZFwiPlxuICAgIDxkaXYgY2xhc3M9XCJjZWxsXCIgZGF0YS1pbmRleD1cIjBcIj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiIGRhdGEtaW5kZXg9XCIxXCI+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImNlbGxcIiBkYXRhLWluZGV4PVwiMlwiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJjZWxsXCIgZGF0YS1pbmRleD1cIjNcIj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiIGRhdGEtaW5kZXg9XCI0XCI+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImNlbGxcIiBkYXRhLWluZGV4PVwiNVwiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJjZWxsXCIgZGF0YS1pbmRleD1cIjZcIj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiIGRhdGEtaW5kZXg9XCI3XCI+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImNlbGxcIiBkYXRhLWluZGV4PVwiOFwiPjwvZGl2PlxuICA8L2Rpdj5cblxuICA8YnV0dG9uIG9uY2xpY2s9XCJyZXN0YXJ0R2FtZSgpXCI+UmVzZXQgR2FtZTwvYnV0dG9uPlxuXG4gIDxzY3JpcHQ+XG4gICAgY29uc3QgSFVNQU4gPSAnWCc7XG4gICAgY29uc3QgQUkgPSAnTyc7XG4gICAgbGV0IGJvYXJkU3RhdGUgPSBBcnJheSg5KS5maWxsKG51bGwpO1xuICAgIGxldCBnYW1lQWN0aXZlID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXR1c1RleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RhdHVzJyk7XG4gICAgY29uc3QgY2VsbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuY2VsbCcpO1xuXG4gICAgY29uc3Qgd2lubmluZ0NvbmRpdGlvbnMgPSBbXG4gICAgICBbMCwgMSwgMl0sIFszLCA0LCA1XSwgWzYsIDcsIDhdLFxuICAgICAgWzAsIDMsIDZdLCBbMSwgNCwgN10sIFsyLCA1LCA4XSxcbiAgICAgIFswLCA0LCA4XSwgWzIsIDQsIDZdXG4gICAgXTtcblxuICAgIGNlbGxzLmZvckVhY2goY2VsbCA9PiBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgaGFuZGxlQ2VsbENsaWNrKSk7XG5cbiAgICBmdW5jdGlvbiBzZXRTdGF0dXModGV4dCkge1xuICAgICAgaWYgKHN0YXR1c1RleHQpIHN0YXR1c1RleHQudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUNlbGxDbGljayhlKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBlLmN1cnJlbnRUYXJnZXQ7XG4gICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgnKSk7XG5cbiAgICAgIGlmIChib2FyZFN0YXRlW2luZGV4XSAhPT0gbnVsbCB8fCAhZ2FtZUFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgICBtYWtlTW92ZShpbmRleCwgSFVNQU4pO1xuXG4gICAgICBpZiAoY2hlY2tXaW4oYm9hcmRTdGF0ZSwgSFVNQU4pKSB7XG4gICAgICAgIHNldFN0YXR1cygnQW5kYSBNZW5hbmchJyk7XG4gICAgICAgIGdhbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNCb2FyZEZ1bGwoYm9hcmRTdGF0ZSkpIHtcbiAgICAgICAgc2V0U3RhdHVzKCdQZXJtYWluYW4gU2VyaSEnKTtcbiAgICAgICAgZ2FtZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHNldFN0YXR1cygnQUkgYmVycGlraXIuLi4nKTtcbiAgICAgIGdhbWVBY3RpdmUgPSBmYWxzZTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJlc3RNb3ZlID0gZ2V0QmVzdE1vdmUoKTtcbiAgICAgICAgaWYgKGJlc3RNb3ZlICE9PSB1bmRlZmluZWQgJiYgYmVzdE1vdmUgIT09IG51bGwpIHtcbiAgICAgICAgICBtYWtlTW92ZShiZXN0TW92ZSwgQUkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoZWNrV2luKGJvYXJkU3RhdGUsIEFJKSkge1xuICAgICAgICAgIHNldFN0YXR1cygnQUkgTWVuYW5nIScpO1xuICAgICAgICAgIGdhbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0JvYXJkRnVsbChib2FyZFN0YXRlKSkge1xuICAgICAgICAgIHNldFN0YXR1cygnUGVybWFpbmFuIFNlcmkhJyk7XG4gICAgICAgICAgZ2FtZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldFN0YXR1cygnR2lsaXJhbiBBbmRhIChYKScpO1xuICAgICAgICAgIGdhbWVBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9LCAyNTApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VNb3ZlKGluZGV4LCBwbGF5ZXIpIHtcbiAgICAgIGJvYXJkU3RhdGVbaW5kZXhdID0gcGxheWVyO1xuICAgICAgY2VsbHNbaW5kZXhdLnRleHRDb250ZW50ID0gcGxheWVyO1xuICAgICAgY2VsbHNbaW5kZXhdLmNsYXNzTGlzdC5hZGQocGxheWVyLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrV2luKGJvYXJkLCBwbGF5ZXIpIHtcbiAgICAgIHJldHVybiB3aW5uaW5nQ29uZGl0aW9ucy5zb21lKGNvbmRpdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiBjb25kaXRpb24uZXZlcnkoaW5kZXggPT4gYm9hcmRbaW5kZXhdID09PSBwbGF5ZXIpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNCb2FyZEZ1bGwoYm9hcmQpIHtcbiAgICAgIHJldHVybiBib2FyZC5ldmVyeShjZWxsID0+IGNlbGwgIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3RhcnRHYW1lKCkge1xuICAgICAgYm9hcmRTdGF0ZSA9IEFycmF5KDkpLmZpbGwobnVsbCk7XG4gICAgICBnYW1lQWN0aXZlID0gdHJ1ZTtcbiAgICAgIHNldFN0YXR1cygnR2lsaXJhbiBBbmRhIChYKScpO1xuICAgICAgY2VsbHMuZm9yRWFjaChjZWxsID0+IHtcbiAgICAgICAgY2VsbC50ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICBjZWxsLmNsYXNzTGlzdC5yZW1vdmUoJ3gnLCAnbycpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0QmVzdE1vdmUoKSB7XG4gICAgICBsZXQgYmVzdFNjb3JlID0gLUluZmluaXR5O1xuICAgICAgbGV0IG1vdmUgPSBudWxsO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA5OyBpKyspIHtcbiAgICAgICAgaWYgKGJvYXJkU3RhdGVbaV0gPT09IG51bGwpIHtcbiAgICAgICAgICBib2FyZFN0YXRlW2ldID0gQUk7XG4gICAgICAgICAgbGV0IHNjb3JlID0gbWluaW1heChib2FyZFN0YXRlLCAwLCBmYWxzZSk7XG4gICAgICAgICAgYm9hcmRTdGF0ZVtpXSA9IG51bGw7XG4gICAgICAgICAgaWYgKHNjb3JlID4gYmVzdFNjb3JlKSB7XG4gICAgICAgICAgICBiZXN0U2NvcmUgPSBzY29yZTtcbiAgICAgICAgICAgIG1vdmUgPSBpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1vdmU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWluaW1heChib2FyZCwgZGVwdGgsIGlzTWF4aW1pemluZykge1xuICAgICAgaWYgKGNoZWNrV2luKGJvYXJkLCBBSSkpIHJldHVybiAxMCAtIGRlcHRoO1xuICAgICAgaWYgKGNoZWNrV2luKGJvYXJkLCBIVU1BTikpIHJldHVybiBkZXB0aCAtIDEwO1xuICAgICAgaWYgKGlzQm9hcmRGdWxsKGJvYXJkKSkgcmV0dXJuIDA7XG5cbiAgICAgIGlmIChpc01heGltaXppbmcpIHtcbiAgICAgICAgbGV0IGJlc3RTY29yZSA9IC1JbmZpbml0eTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA5OyBpKyspIHtcbiAgICAgICAgICBpZiAoYm9hcmRbaV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGJvYXJkW2ldID0gQUk7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBtaW5pbWF4KGJvYXJkLCBkZXB0aCArIDEsIGZhbHNlKTtcbiAgICAgICAgICAgIGJvYXJkW2ldID0gbnVsbDtcbiAgICAgICAgICAgIGJlc3RTY29yZSA9IE1hdGgubWF4KHNjb3JlLCBiZXN0U2NvcmUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmVzdFNjb3JlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGJlc3RTY29yZSA9IEluZmluaXR5O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDk7IGkrKykge1xuICAgICAgICAgIGlmIChib2FyZFtpXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgYm9hcmRbaV0gPSBIVU1BTjtcbiAgICAgICAgICAgIGxldCBzY29yZSA9IG1pbmltYXgoYm9hcmQsIGRlcHRoICsgMSwgdHJ1ZSk7XG4gICAgICAgICAgICBib2FyZFtpXSA9IG51bGw7XG4gICAgICAgICAgICBiZXN0U2NvcmUgPSBNYXRoLm1pbihzY29yZSwgYmVzdFNjb3JlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJlc3RTY29yZTtcbiAgICAgIH1cbiAgICB9XG4gIDwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPiIsInRydXN0ZWRfc291cmNlcyI6WyJuaXhlbC5kZXYiXX0sIl9fdHlwZW5hbWUiOiJHZW5BSVNpbmdsZUxheW91dFZpZXdNb2RlbCJ9fV19', 'base64')
                },
                contextInfo: {
                  mentionedJid: [],
                  groupMentions: [],
                  statusAttributions: [],
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedAiBotMessageInfo: {
                    botJid: "867051314767696@bot"
                  },
                  forwardOrigin: 4
                },
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                }
              }
            },
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            }
          }
        },
        {
          additionalAttributes: {
            type: "text"
          }
        }
      )
      
      await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
    } catch (error) {
      console.error('[CRM PLUGIN ERROR]', error?.message || error)
      await m.reply('❌ Gagal mengirim pesan: ' + (error?.message || error))
    }
  }
}