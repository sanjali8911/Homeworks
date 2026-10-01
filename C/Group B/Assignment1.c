#include <stdio.h>
#include <limits.h>
int main(){
    //storing elements in array
    printf("Enter elements in array");
    int n;
     scanf("%d", &n);
    int arr[n], i, min, max, freq, avg, ch, forFre, sum;
    for(i=0; i<n; i++){
        scanf("%d", &arr[i]);
    }
// defining menu
do { printf("Enter your choice \n 1) Find Max and Min element \n 2) Find Frequency of given element in array \n 3) Find Average of elements in array \n 4) Find Mean of the array. \n 5) exit code");

scanf("%d", &ch);
switch (ch)
{
case 1:
//max element
max = INT_MIN;
min = INT_MAX;
  for(i=0; i<n; i++){
   if(arr[i]>max){
    max=arr[i];
   }
}
  for(i=0; i<n; i++){
   if(arr[i]<min){
    min=arr[i];
   }
}
printf("Maximum is %d and min is %d", max, min);
break;
case 2:
//Find Frequency of given element in array
scanf("%d", &forFre);
freq=0;
for(i=0; i<n; i++){
   if(arr[i]==forFre){
   freq++;
   }
}
printf("%d \n", freq);
break;
case 3:
// Find Average of elements in array
sum = 0;
for(i=0; i<n; i++){
  sum += arr[i];
   }
printf("Avg is %d", sum/n);
break;
case 4:
sum = 0;
for(i=0; i<n; i++){
  sum += arr[i];
   }

printf("Avg is %d", sum/n);
break;
}
} while(
ch != 5
);

}